"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, clientIp } from "@/lib/auth/session";
import { checkoutSchema, normalizePhone } from "@/lib/checkout-schema";
import { processNotifications } from "@/lib/notify";
import { canViewOrder, grantOrderAccess } from "@/lib/order-access";
import {
  OrderError,
  placeOrder,
  simulateDevPayment,
  startOnlinePayment,
  verifyRazorpayCheckout,
  type PaymentStart,
} from "@/lib/orders";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cartSchema } from "@/lib/quote";

export type FieldErrors = Record<string, string>;
export type PlaceResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

const friendly = (e: unknown): string => {
  if (e instanceof OrderError) return e.message;
  console.error("[checkout] unexpected error", e);
  return "Something went wrong while placing your order. Please try again.";
};

/** Validate everything on the server, price from the database, and create the order in one transaction. */
export async function placeOrderAction(rawCart: unknown, rawForm: unknown): Promise<PlaceResult> {
  const cart = cartSchema.safeParse(rawCart);
  if (!cart.success || cart.data.items.length === 0) return { ok: false, error: "Your cart is empty." };

  const form = checkoutSchema.safeParse(rawForm);
  if (!form.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of form.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }

  const limit = await rateLimit(`checkout:${await clientIp()}`, LIMITS.checkout);
  if (!limit.ok) return { ok: false, error: "Too many order attempts. Please wait a few minutes and try again." };

  try {
    const user = await getCurrentUser();
    const placed = await placeOrder({ cart: cart.data, checkout: form.data, user: user ? { id: user.id } : null });
    await grantOrderAccess(placed.orderNumber);
    after(() => processNotifications().catch(() => undefined));
    return { ok: true, orderNumber: placed.orderNumber };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

async function authorizedOrder(orderNumber: string) {
  const order = await db.order.findUnique({ where: { orderNumber } });
  if (!order || !(await canViewOrder(order))) throw new OrderError("Order not found.", "NOT_FOUND");
  return order;
}

export type StartPaymentResult = { ok: true; payment: PaymentStart; customer: { name: string; email: string | null; phone: string } } | { ok: false; error: string };

/** Create (or reuse) the provider payment for an unpaid order the caller is allowed to see. */
export async function startPaymentAction(orderNumber: string): Promise<StartPaymentResult> {
  try {
    const order = await authorizedOrder(orderNumber);
    const payment = await startOnlinePayment(orderNumber);
    return { ok: true, payment, customer: { name: order.customerName, email: order.customerEmail, phone: order.customerPhone } };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

/** Called after Razorpay Checkout succeeds in the browser. The server verifies the signature AND the payment itself. */
export async function verifyPaymentAction(orderNumber: string, raw: unknown): Promise<{ ok: boolean; status?: "paid" | "pending" | "failed"; error?: string }> {
  const parsed = verifySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Payment details were incomplete." };
  try {
    await authorizedOrder(orderNumber);
    const r = await verifyRazorpayCheckout({
      orderNumber,
      razorpayOrderId: parsed.data.razorpay_order_id,
      razorpayPaymentId: parsed.data.razorpay_payment_id,
      razorpaySignature: parsed.data.razorpay_signature,
    });
    after(() => processNotifications().catch(() => undefined));
    return { ok: r.status !== "failed", status: r.status, error: r.message };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

/** Development-only payment simulator (refused automatically unless PAYMENT_MODE resolves to "dev"). */
export async function devPayAction(orderNumber: string, outcome: "success" | "failure"): Promise<{ ok: boolean; error?: string }> {
  try {
    await authorizedOrder(orderNumber);
    await simulateDevPayment(orderNumber, outcome === "success" ? "success" : "failure");
    after(() => processNotifications().catch(() => undefined));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

/** Guests prove they own an order with its number + the phone number used at checkout. */
export async function trackOrderAction(_prev: { ok: boolean; message: string } | null, formData: FormData): Promise<{ ok: boolean; message: string } | null> {
  const number = String(formData.get("orderNumber") ?? "").trim().toUpperCase();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const generic = "We could not find an order with those details.";
  if (!number || !phone) return { ok: false, message: generic };

  const limit = await rateLimit(`track:${await clientIp()}`, LIMITS.track);
  if (!limit.ok) return { ok: false, message: "Too many attempts. Please try again later." };

  const order = await db.order.findUnique({ where: { orderNumber: number }, select: { orderNumber: true, customerPhone: true } });
  if (!order || order.customerPhone !== phone) return { ok: false, message: generic };
  await grantOrderAccess(order.orderNumber);
  redirect(`/account/orders/${order.orderNumber}`);
}
