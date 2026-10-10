import type { PaymentMethod } from "@/generated/prisma/enums";
import { db, type Tx } from "./db";
import { SYSTEM_ACTOR, type Actor } from "./audit";
import { checkFulfillmentTransition } from "./order-state";
import { env, paymentMode } from "./env";
import { enqueue, templates, type OrderMailInfo } from "./notify";
import { quoteCart, type CartInput, type Quote } from "./quote";
import { getSettings, type Settings } from "./settings";
import type { CheckoutInput } from "./checkout-schema";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  razorpayKeyId,
  verifyCheckoutSignature,
} from "./payments/razorpay";

export type OrderErrorCode =
  | "CLOSED"
  | "INVALID_CART"
  | "PAYMENT_UNAVAILABLE"
  | "OUT_OF_STOCK"
  | "COUPON"
  | "NOT_FOUND"
  | "STATE"
  | "PAYMENT";

export class OrderError extends Error {
  constructor(message: string, public code: OrderErrorCode) {
    super(message);
    this.name = "OrderError";
  }
}

const mailInfo = (o: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  totalPaise: number;
}): OrderMailInfo => ({
  orderNumber: o.orderNumber,
  customerName: o.customerName,
  customerEmail: o.customerEmail,
  totalPaise: o.totalPaise,
});

/** Row-lock an order for the rest of the transaction so concurrent updates are serialised. */
export const lockOrder = (tx: Tx, orderId: string) => tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;

async function nextOrderNumber(tx: Tx, prefix: string): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("name", "value") VALUES ('order', 1)
    ON CONFLICT ("name") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  return `${prefix}-${1000 + Number(rows[0].value)}`;
}

// ───────────────────────────── Placing an order ─────────────────────────────

export type PlacedOrder = {
  id: string;
  orderNumber: string;
  paymentMethod: PaymentMethod;
  totalPaise: number;
  requiresOnlinePayment: boolean;
};

export type PlaceOrderArgs = {
  cart: CartInput;
  checkout: CheckoutInput;
  user: { id: string } | null;
  settings?: Settings;
};

/**
 * Create an order transactionally. Prices, stock, coupon eligibility and delivery fees are all recomputed
 * from the database inside the transaction: the client's totals are never used.
 *   1. lock the coupon row (serialises redemptions)
 *   2. re-quote the cart on the transaction's snapshot
 *   3. decrement stock with a guarded UPDATE (cannot oversell under concurrency)
 *   4. snapshot items, record movements, redemption and first history entry
 */
export async function placeOrder({ cart, checkout, user, settings: given }: PlaceOrderArgs): Promise<PlacedOrder> {
  const settings = given ?? (await getSettings());
  if (!settings.orderingEnabled) throw new OrderError(settings.orderingClosedMessage, "CLOSED");

  // Idempotent re-submit: return the order already created for this key.
  const existing = await db.order.findUnique({ where: { idempotencyKey: checkout.idempotencyKey } });
  if (existing) return toPlaced(existing);

  const mode = paymentMode();
  let method: PaymentMethod;
  if (checkout.paymentMethod === "COD") {
    if (!settings.codEnabled) throw new OrderError("Cash on delivery is not available.", "PAYMENT_UNAVAILABLE");
    method = "COD";
  } else {
    if (!settings.onlinePaymentEnabled || mode === "off") {
      throw new OrderError("Online payment is not available right now.", "PAYMENT_UNAVAILABLE");
    }
    method = mode === "razorpay" ? "RAZORPAY" : "DEV";
  }

  const customerKey = user?.id ?? checkout.customerPhone;
  const code = cart.couponCode?.trim().toUpperCase().replace(/\s+/g, "");

  try {
    const order = await db.$transaction(
      async (tx) => {
        if (code) await tx.$queryRaw`SELECT "id" FROM "Coupon" WHERE "code" = ${code} FOR UPDATE`;

        const quote = await quoteCart(tx, cart, {
          settings,
          customerKey,
          deliveryOptionId: checkout.deliveryOptionId,
          postalCode: checkout.postalCode,
        });
        if (quote.lines.length === 0) throw new OrderError("Your cart is empty.", "INVALID_CART");
        if (quote.deliveryError) throw new OrderError(quote.deliveryError, "INVALID_CART");
        if (quote.issues.length) throw new OrderError(quote.issues[0], "OUT_OF_STOCK");
        if (cart.couponCode && quote.couponError) throw new OrderError(quote.couponError, "COUPON");
        if (!quote.delivery) throw new OrderError("Please choose a delivery option.", "INVALID_CART");

        const orderNumber = await nextOrderNumber(tx, settings.orderPrefix);
        const cod = method === "COD";
        const created = await tx.order.create({
          data: {
            orderNumber,
            userId: user?.id,
            customerName: checkout.customerName,
            customerEmail: checkout.customerEmail || null,
            customerPhone: checkout.customerPhone,
            shipName: checkout.recipientName || checkout.customerName,
            shipPhone: checkout.recipientPhone ? checkout.recipientPhone : checkout.customerPhone,
            shipLine1: checkout.line1,
            shipLine2: checkout.line2 || null,
            shipCity: checkout.city,
            shipState: checkout.state || null,
            shipPostalCode: checkout.postalCode,
            deliveryNote: checkout.deliveryNote || null,
            giftMessage: checkout.giftMessage || null,
            deliveryOptionId: quote.delivery.optionId,
            deliveryLabel: quote.delivery.label,
            subtotalPaise: quote.pricing.subtotalPaise,
            discountPaise: quote.pricing.discountPaise,
            shippingPaise: quote.pricing.shippingPaise,
            taxPaise: quote.pricing.taxPaise,
            totalPaise: quote.pricing.totalPaise,
            couponCode: quote.coupon?.code ?? null,
            paymentMethod: method,
            paymentStatus: "PENDING",
            fulfillmentStatus: cod ? "CONFIRMED" : "PENDING_PAYMENT",
            isTest: method === "DEV",
            idempotencyKey: checkout.idempotencyKey,
            items: {
              create: quote.lines.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                productName: l.productName,
                variantLabel: l.variantLabel,
                sku: l.sku,
                imageUrl: l.imageUrl,
                unitPricePaise: l.unitPricePaise,
                quantity: l.quantity,
                lineTotalPaise: l.lineTotalPaise,
                selections: l.selections ?? undefined,
              })),
            },
            history: {
              create: [
                {
                  kind: "FULFILLMENT",
                  toStatus: cod ? "CONFIRMED" : "PENDING_PAYMENT",
                  note: cod ? "Order placed (cash on delivery)" : "Order placed, awaiting payment",
                  actorId: user?.id,
                  actorLabel: "Customer",
                },
              ],
            },
          },
        });

        await reserveStock(tx, created.id, quote);

        if (quote.coupon) {
          await tx.coupon.update({ where: { id: quote.coupon.id }, data: { usedCount: { increment: 1 } } });
          await tx.couponRedemption.create({
            data: { couponId: quote.coupon.id, orderId: created.id, customerKey, amountPaise: quote.coupon.discountPaise },
          });
        }

        await enqueue(tx, created, templates.orderPlaced(mailInfo(created), settings.businessName));
        return created;
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
    return toPlaced(order);
  } catch (e) {
    // Two identical submissions raced: the loser hits the unique idempotency key.
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      const again = await db.order.findUnique({ where: { idempotencyKey: checkout.idempotencyKey } });
      if (again) return toPlaced(again);
    }
    throw e;
  }
}

function toPlaced(o: { id: string; orderNumber: string; paymentMethod: PaymentMethod; totalPaise: number }): PlacedOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    paymentMethod: o.paymentMethod,
    totalPaise: o.totalPaise,
    requiresOnlinePayment: o.paymentMethod !== "COD",
  };
}

/** Guarded decrement: the WHERE clause makes it impossible for concurrent orders to push stock below zero. */
async function reserveStock(tx: Tx, orderId: string, quote: Quote) {
  const demand = new Map<string, { qty: number; tracked: boolean; label: string }>();
  for (const l of quote.lines) {
    const d = demand.get(l.variantId) ?? { qty: 0, tracked: l.tracked, label: `${l.productName} (${l.variantLabel})` };
    d.qty += l.quantity;
    demand.set(l.variantId, d);
  }
  for (const [variantId, d] of demand) {
    if (!d.tracked) continue;
    const rows = await tx.$queryRaw<{ stockQuantity: number }[]>`
      UPDATE "ProductVariant" SET "stockQuantity" = "stockQuantity" - ${d.qty}
      WHERE "id" = ${variantId} AND "trackInventory" = true AND "stockQuantity" >= ${d.qty}
      RETURNING "stockQuantity"`;
    if (rows.length === 0) throw new OrderError(`${d.label} just sold out. Please update your cart.`, "OUT_OF_STOCK");
    await tx.inventoryMovement.create({
      data: { variantId, delta: -d.qty, quantityAfter: Number(rows[0].stockQuantity), reason: "SALE", orderId, note: "Order placed" },
    });
  }
}

/** Return reserved stock and release the coupon use for an order that will not be fulfilled. Idempotent. */
async function releaseOrderResources(tx: Tx, orderId: string, opts: { releaseCoupon: boolean }) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, redemption: true } });
  if (!order || order.stockReleasedAt) return;
  for (const item of order.items) {
    if (!item.variantId) continue;
    const rows = await tx.$queryRaw<{ stockQuantity: number }[]>`
      UPDATE "ProductVariant" SET "stockQuantity" = "stockQuantity" + ${item.quantity}
      WHERE "id" = ${item.variantId} AND "trackInventory" = true
      RETURNING "stockQuantity"`;
    if (rows.length) {
      await tx.inventoryMovement.create({
        data: { variantId: item.variantId, delta: item.quantity, quantityAfter: Number(rows[0].stockQuantity), reason: "CANCELLATION", orderId, note: "Order cancelled" },
      });
    }
  }
  if (opts.releaseCoupon && order.redemption) {
    await tx.coupon.update({ where: { id: order.redemption.couponId }, data: { usedCount: { decrement: 1 } } });
    await tx.couponRedemption.delete({ where: { id: order.redemption.id } });
  }
  await tx.order.update({ where: { id: orderId }, data: { stockReleasedAt: new Date() } });
}

/** Count units sold for popularity sorting. Idempotent via salesRecordedAt. */
async function recordSales(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.salesRecordedAt) return;
  const byProduct = new Map<string, number>();
  for (const i of order.items) if (i.productId) byProduct.set(i.productId, (byProduct.get(i.productId) ?? 0) + i.quantity);
  for (const [productId, qty] of byProduct) {
    await tx.product.update({ where: { id: productId }, data: { soldCount: { increment: qty } } });
  }
  await tx.order.update({ where: { id: orderId }, data: { salesRecordedAt: new Date() } });
}

// ───────────────────────────── Payments ─────────────────────────────

export type PaymentStart =
  | { mode: "razorpay"; keyId: string; razorpayOrderId: string; amountPaise: number }
  | { mode: "dev"; devOrderId: string; amountPaise: number };

/** Create (or reuse) the provider-side payment order for an unpaid online order. The amount comes from the database. */
export async function startOnlinePayment(orderNumber: string): Promise<PaymentStart> {
  const order = await db.order.findUnique({ where: { orderNumber } });
  if (!order) throw new OrderError("Order not found.", "NOT_FOUND");
  if (order.paymentMethod === "COD") throw new OrderError("This order is cash on delivery.", "STATE");
  if (order.paymentStatus === "PAID") throw new OrderError("This order is already paid.", "STATE");
  if (order.fulfillmentStatus === "CANCELLED") throw new OrderError("This order was cancelled.", "STATE");

  const mode = paymentMode();
  if (mode === "off" || (mode === "razorpay") !== (order.paymentMethod === "RAZORPAY")) {
    throw new OrderError("Online payment is not available for this order.", "PAYMENT_UNAVAILABLE");
  }

  // Reuse an open attempt for the same amount (page refresh / retry) rather than piling up provider orders.
  const open = await db.payment.findFirst({
    where: { orderId: order.id, status: "CREATED", amountPaise: order.totalPaise, providerOrderId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  let providerOrderId = open?.providerOrderId ?? null;
  if (!providerOrderId) {
    providerOrderId =
      mode === "razorpay"
        ? (await createRazorpayOrder(order.totalPaise, order.orderNumber)).id
        : `dev_order_${order.id}_${Date.now()}`;
    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: { orderId: order.id, provider: order.paymentMethod, providerOrderId, amountPaise: order.totalPaise },
      });
      if (order.paymentStatus === "FAILED") {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING" } });
        await tx.orderStatusHistory.create({
          data: { orderId: order.id, kind: "PAYMENT", fromStatus: "FAILED", toStatus: "PENDING", note: "Payment retry started", actorLabel: "Customer" },
        });
      }
    });
  }
  return mode === "razorpay"
    ? { mode, keyId: razorpayKeyId(), razorpayOrderId: providerOrderId, amountPaise: order.totalPaise }
    : { mode: "dev", devOrderId: providerOrderId, amountPaise: order.totalPaise };
}

export type PaymentApplyResult = { status: "applied" | "already" | "mismatch" | "not_found"; orderNumber?: string };

/**
 * Record a captured payment. The ONLY path that marks an order paid; used by the verified checkout
 * callback, the signature-verified webhook and the development simulator. Idempotent and amount-checked.
 */
export async function applyPaymentCaptured(p: {
  providerOrderId: string;
  providerPaymentId: string;
  amountPaise: number;
  currency: string;
  method?: string | null;
  actorLabel: string;
}): Promise<PaymentApplyResult> {
  const settings = await getSettings();
  return db.$transaction(async (tx) => {
    const found = await tx.payment.findUnique({ where: { providerOrderId: p.providerOrderId } });
    if (!found) return { status: "not_found" as const };
    await lockOrder(tx, found.orderId);
    // Re-read AFTER taking the lock: a concurrent callback may have just captured this payment.
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: found.id } });
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });

    if (payment.status === "CAPTURED") return { status: "already" as const, orderNumber: order.orderNumber };

    // Never trust the callback amount: it must equal both the stored attempt and the order total.
    if (p.currency !== "INR" || p.amountPaise !== payment.amountPaise || p.amountPaise !== order.totalPaise) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureCode: "AMOUNT_MISMATCH", failureReason: `Provider reported ${p.amountPaise} ${p.currency}, expected ${order.totalPaise} INR` },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, kind: "NOTE", toStatus: "PAYMENT_MISMATCH", note: "A payment amount did not match the order total and was rejected.", actorLabel: p.actorLabel, customerVisible: false },
      });
      return { status: "mismatch" as const, orderNumber: order.orderNumber };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "CAPTURED", providerPaymentId: p.providerPaymentId, method: p.method ?? null, capturedAt: new Date() },
    });

    // A second, different payment for an order that is already paid: keep it, flag it for refund.
    if (order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED" || order.paymentStatus === "REFUNDED") {
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, kind: "NOTE", toStatus: "DUPLICATE_PAYMENT", note: `Duplicate payment ${p.providerPaymentId} received. Refund it from the admin panel.`, actorLabel: p.actorLabel, customerVisible: false },
      });
      return { status: "applied" as const, orderNumber: order.orderNumber };
    }

    const prevPayment = order.paymentStatus;
    if (order.fulfillmentStatus === "CANCELLED") {
      // Paid after the order was cancelled/expired: record the money, keep it cancelled, flag a refund.
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", paidAt: new Date() } });
      await tx.orderStatusHistory.createMany({
        data: [
          { orderId: order.id, kind: "PAYMENT", fromStatus: prevPayment, toStatus: "PAID", note: "Payment received after the order was cancelled. Refund required.", actorLabel: p.actorLabel, customerVisible: false },
        ],
      });
      return { status: "applied" as const, orderNumber: order.orderNumber };
    }

    const fromFulfillment = order.fulfillmentStatus;
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", paidAt: new Date(), fulfillmentStatus: fromFulfillment === "PENDING_PAYMENT" ? "CONFIRMED" : fromFulfillment },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, kind: "PAYMENT", fromStatus: prevPayment, toStatus: "PAID", note: "Payment received", actorLabel: p.actorLabel },
    });
    if (fromFulfillment === "PENDING_PAYMENT") {
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, kind: "FULFILLMENT", fromStatus: "PENDING_PAYMENT", toStatus: "CONFIRMED", note: "Order confirmed", actorLabel: "System" },
      });
    }
    await recordSales(tx, order.id);
    await enqueue(tx, order, templates.paymentConfirmed(mailInfo(order), settings.businessName));
    return { status: "applied" as const, orderNumber: order.orderNumber };
  });
}

export async function applyPaymentFailed(p: { providerOrderId: string; code?: string | null; reason?: string | null }) {
  return db.$transaction(async (tx) => {
    const found = await tx.payment.findUnique({ where: { providerOrderId: p.providerOrderId } });
    if (!found) return;
    await lockOrder(tx, found.orderId);
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: found.id } });
    if (payment.status !== "CREATED") return;
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureCode: p.code ?? null, failureReason: p.reason?.slice(0, 300) ?? null },
    });
    if (order.paymentStatus === "PENDING" && order.fulfillmentStatus === "PENDING_PAYMENT") {
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, kind: "PAYMENT", fromStatus: "PENDING", toStatus: "FAILED", note: p.reason ?? "Payment failed", actorLabel: "Payment provider" },
      });
    }
  });
}

/**
 * Verify a Razorpay Checkout callback on the server: HMAC signature, then an authoritative fetch of the
 * payment from Razorpay to confirm status, amount and currency. The browser's word alone is never enough.
 */
export async function verifyRazorpayCheckout(input: {
  orderNumber: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ status: "paid" | "pending" | "failed"; message?: string }> {
  const secret = env().RAZORPAY_KEY_SECRET;
  if (!secret) throw new OrderError("Razorpay is not configured.", "PAYMENT_UNAVAILABLE");

  const payment = await db.payment.findUnique({ where: { providerOrderId: input.razorpayOrderId }, include: { order: true } });
  if (!payment || payment.order.orderNumber !== input.orderNumber) throw new OrderError("Payment does not match this order.", "PAYMENT");
  if (!verifyCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature, secret)) {
    throw new OrderError("Payment signature could not be verified.", "PAYMENT");
  }

  const remote = await fetchRazorpayPayment(input.razorpayPaymentId);
  if (remote.order_id !== input.razorpayOrderId) throw new OrderError("Payment does not match this order.", "PAYMENT");
  if (remote.status === "failed") {
    await applyPaymentFailed({ providerOrderId: input.razorpayOrderId, code: remote.error_code, reason: remote.error_description });
    return { status: "failed", message: remote.error_description ?? "Payment failed." };
  }
  if (remote.status !== "captured") return { status: "pending", message: "Your payment is being confirmed." };

  const result = await applyPaymentCaptured({
    providerOrderId: input.razorpayOrderId,
    providerPaymentId: remote.id,
    amountPaise: remote.amount,
    currency: remote.currency,
    method: remote.method,
    actorLabel: "Razorpay (verified checkout)",
  });
  if (result.status === "mismatch") throw new OrderError("The payment amount did not match the order.", "PAYMENT");
  return { status: "paid" };
}

/** Development-only payment simulator. Refused outside dev mode, and always flagged as test data. */
export async function simulateDevPayment(orderNumber: string, outcome: "success" | "failure"): Promise<void> {
  if (paymentMode() !== "dev") throw new OrderError("Development payments are disabled.", "PAYMENT_UNAVAILABLE");
  const payment = await db.payment.findFirst({
    where: { order: { orderNumber }, provider: "DEV", status: "CREATED" },
    orderBy: { createdAt: "desc" },
  });
  if (!payment?.providerOrderId) throw new OrderError("No open development payment for this order.", "NOT_FOUND");
  if (outcome === "failure") {
    await applyPaymentFailed({ providerOrderId: payment.providerOrderId, code: "DEV_SIMULATED", reason: "Simulated payment failure (development mode)" });
    return;
  }
  const result = await applyPaymentCaptured({
    providerOrderId: payment.providerOrderId,
    providerPaymentId: `dev_pay_${payment.id}`,
    amountPaise: payment.amountPaise,
    currency: "INR",
    method: "dev-simulator",
    actorLabel: "Development payment simulator",
  });
  if (result.status === "mismatch") throw new OrderError("Simulated amount mismatch.", "PAYMENT");
}

// ───────────────────────────── Cancellation / expiry ─────────────────────────────

/**
 * Cancel an order inside a transaction: validates the transition, returns stock, releases the coupon for
 * unpaid orders. It NEVER issues a refund: a paid, cancelled order is flagged and refunded explicitly.
 */
export async function cancelOrderTx(tx: Tx, orderId: string, actor: Actor, reason: string | null) {
  await lockOrder(tx, orderId);
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.fulfillmentStatus === "CANCELLED") return order;
  const check = checkFulfillmentTransition(order, "CANCELLED");
  if (!check.ok) throw new OrderError(check.reason, "STATE");

  const updated = await tx.order.update({ where: { id: orderId }, data: { fulfillmentStatus: "CANCELLED" } });
  await tx.orderStatusHistory.create({
    data: { orderId, kind: "FULFILLMENT", fromStatus: order.fulfillmentStatus, toStatus: "CANCELLED", note: reason, actorId: actor.id, actorLabel: actor.label },
  });
  await releaseOrderResources(tx, orderId, { releaseCoupon: order.paymentStatus !== "PAID" });
  const settings = await getSettings();
  await enqueue(tx, order, templates.cancelled(mailInfo(order), reason, settings.businessName));
  return updated;
}

/** Cancel unpaid online orders whose payment window has passed, returning their stock. Run by cron. */
export async function expireUnpaidOrders(maxAgeMinutes = 60): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000);
  const stale = await db.order.findMany({
    where: { fulfillmentStatus: "PENDING_PAYMENT", paymentMethod: { in: ["RAZORPAY", "DEV"] }, paymentStatus: { in: ["PENDING", "FAILED"] }, placedAt: { lt: cutoff } },
    select: { id: true },
    take: 100,
  });
  let n = 0;
  for (const { id } of stale) {
    try {
      await db.$transaction((tx) => cancelOrderTx(tx, id, SYSTEM_ACTOR, "Payment was not completed in time"));
      n++;
    } catch {
      /* another process updated it first; skip */
    }
  }
  return n;
}
