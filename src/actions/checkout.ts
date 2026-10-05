"use server";

import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getSettings } from "@/lib/config";
import { readSession } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/utils";
import { cartItemsSchema, checkoutSchema, type CartItemsInput, type CheckoutInput } from "@/lib/validation/checkout";
import { computeQuote } from "@/lib/orders/quote";
import { getProvider } from "@/lib/payments/providers";
import type { PaymentIntent } from "@/lib/payments/types";
import type { ActionResult } from "@/types";

export interface QuoteView {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode: string | null;
  couponMessage: string | null;
}

/** Server-priced totals for the cart/checkout UI. */
export async function quoteCart(items: CartItemsInput, couponCode?: string): Promise<ActionResult<QuoteView>> {
  const parsed = cartItemsSchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: "Your cart is empty" };
  const q = await computeQuote(parsed.data, couponCode);
  if (!q.ok) return { ok: false, error: q.error };
  return {
    ok: true,
    data: {
      subtotal: q.subtotal,
      discount: q.discount,
      deliveryFee: q.deliveryFee,
      total: q.total,
      couponCode: q.couponCode,
      couponMessage: q.couponMessage,
    },
  };
}

function newOrderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `DGAP-${ymd}-${randomInt(1000, 10000)}`;
}

export interface PlacedOrder {
  publicId: string;
  orderNumber: string;
  intent: PaymentIntent;
}

export async function placeOrder(form: CheckoutInput, items: CartItemsInput): Promise<ActionResult<PlacedOrder>> {
  const ip = await clientIp();
  const rl = rateLimit(`checkout:${ip}`, 8, 10 * 60_000);
  if (!rl.ok) return { ok: false, error: `Too many attempts. Please try again in ${rl.retryAfter} seconds.` };

  const parsedForm = checkoutSchema.safeParse(form);
  if (!parsedForm.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsedForm.error.issues) {
      const k = String(issue.path[0] ?? "form");
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const parsedItems = cartItemsSchema.safeParse(items);
  if (!parsedItems.success) return { ok: false, error: "Your cart is empty." };

  const data = parsedForm.data;
  const settings = await getSettings();
  const provider = getProvider(data.paymentMethod);
  if (!provider.isAvailable({ codEnabled: settings.codEnabledBool })) {
    return { ok: false, error: "That payment method is not available right now." };
  }

  const quote = await computeQuote(parsedItems.data, data.couponCode);
  if (!quote.ok) return { ok: false, error: quote.error };

  const session = await readSession();
  const clean = {
    fullName: sanitizeText(data.fullName),
    email: data.email ? data.email.toLowerCase() : null,
    address: sanitizeText(data.address),
    area: sanitizeText(data.area),
    city: sanitizeText(data.city),
    state: sanitizeText(data.state),
    instructions: data.deliveryInstructions ? sanitizeText(data.deliveryInstructions) : null,
    notes: data.notes ? sanitizeText(data.notes) : null,
  };

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      // Reserve stock atomically; fails if someone else bought the last piece.
      for (const l of quote.lines) {
        const res = await tx.product.updateMany({
          where: { id: l.productId, stock: { gte: l.quantity }, isActive: true },
          data: { stock: { decrement: l.quantity } },
        });
        if (res.count !== 1) throw new Error(`STOCK:${l.name}`);
      }
      if (quote.couponId) {
        const c = await tx.coupon.findUniqueOrThrow({ where: { id: quote.couponId } });
        const res = await tx.coupon.updateMany({
          where: { id: c.id, isActive: true, ...(c.usageLimit != null ? { usedCount: { lt: c.usageLimit } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (res.count !== 1) throw new Error("COUPON");
      }

      let customerId: string | null = session?.userId ?? null;
      if (!customerId) {
        const guest = await tx.customer.findFirst({ where: { phone: data.mobile, passwordHash: null, role: "CUSTOMER" } });
        if (guest) customerId = guest.id;
        else {
          const emailTaken = clean.email ? await tx.customer.findUnique({ where: { email: clean.email } }) : null;
          const created = await tx.customer.create({
            data: { name: clean.fullName, phone: data.mobile, email: emailTaken ? null : clean.email },
          });
          customerId = created.id;
        }
      }

      const address = await tx.address.create({
        data: {
          customerId,
          fullName: clean.fullName,
          phone: data.mobile,
          line1: clean.address,
          area: clean.area,
          city: clean.city,
          state: clean.state,
          pincode: data.pincode,
        },
      });

      return tx.order.create({
        data: {
          orderNumber: newOrderNumber(),
          customerId,
          customerName: clean.fullName,
          customerEmail: clean.email,
          customerPhone: data.mobile,
          addressId: address.id,
          subtotal: quote.subtotal,
          deliveryFee: quote.deliveryFee,
          discount: quote.discount,
          total: quote.total,
          couponId: quote.couponId,
          deliveryInstructions: clean.instructions,
          notes: clean.notes,
          items: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              name: l.name,
              image: l.image,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
            })),
          },
          payment: { create: { method: data.paymentMethod, amount: quote.total, provider: provider.id.toLowerCase() } },
        },
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("STOCK:")) return { ok: false, error: `"${msg.slice(6)}" just sold out. Please update your cart.` };
    if (msg === "COUPON") return { ok: false, error: "That coupon is no longer available. Remove it and try again." };
    console.error("placeOrder failed", e);
    return { ok: false, error: "We couldn't place your order. Please try again." };
  }

  try {
    const intent = await provider.createIntent({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
    });
    if (intent.kind === "razorpay") {
      await prisma.payment.update({ where: { orderId: order.id }, data: { providerOrderId: intent.razorpayOrderId } });
    }
    return { ok: true, data: { publicId: order.publicId, orderNumber: order.orderNumber, intent } };
  } catch (e) {
    console.error("payment intent failed", e);
    await releaseOrder(order.id, "FAILED");
    return { ok: false, error: "We couldn't start the payment. Your cart is safe — please try again." };
  }
}

/** Cancels an order, restores stock and coupon usage. Used when payment can't start or is abandoned. */
async function releaseOrder(orderId: string, paymentStatus: "FAILED"): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o || o.status === "CANCELLED") return;
    for (const i of o.items) {
      if (i.productId) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
    }
    if (o.couponId) await tx.coupon.updateMany({ where: { id: o.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.payment.update({ where: { orderId }, data: { status: paymentStatus } });
  });
}

/** Called by the client when the customer dismisses the Razorpay modal without paying. */
export async function abandonPayment(publicId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { publicId }, include: { payment: true } });
  if (order && order.status === "PENDING" && order.payment?.method === "RAZORPAY" && order.payment.status === "PENDING") {
    await releaseOrder(order.id, "FAILED");
  }
}
