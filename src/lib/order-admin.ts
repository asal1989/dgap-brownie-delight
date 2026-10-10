import type { FulfillmentStatus } from "@/generated/prisma/enums";
import { db, type Tx } from "./db";
import { audit, type Actor } from "./audit";
import { enqueue, templates } from "./notify";
import { cancelOrderTx, lockOrder, OrderError } from "./orders";
import { checkFulfillmentTransition, checkPaymentTransition } from "./order-state";
import { refundRazorpayPayment } from "./payments/razorpay";
import { getSettings } from "./settings";

const mail = (o: { orderNumber: string; customerName: string; customerEmail: string | null; totalPaise: number }) => ({
  orderNumber: o.orderNumber,
  customerName: o.customerName,
  customerEmail: o.customerEmail,
  totalPaise: o.totalPaise,
});

/** Move an order along its fulfilment lifecycle. Every change is validated, persisted, timelined and audited. */
export async function advanceFulfillment(args: {
  orderId: string;
  to: FulfillmentStatus;
  note?: string | null;
  cashCollected?: boolean;
  actor: Actor;
  ip?: string;
}) {
  const settings = await getSettings();
  return db.$transaction(async (tx) => {
    await lockOrder(tx, args.orderId);
    const order = await tx.order.findUnique({ where: { id: args.orderId } });
    if (!order) throw new OrderError("Order not found.", "NOT_FOUND");

    if (args.to === "CANCELLED") {
      const cancelled = await cancelOrderTx(tx, args.orderId, args.actor, args.note ?? null);
      await audit(args.actor, "order.cancel", "Order", order.id, { orderNumber: order.orderNumber, note: args.note ?? null }, tx, args.ip);
      return cancelled;
    }

    const check = checkFulfillmentTransition(order, args.to);
    if (!check.ok) throw new OrderError(check.reason, "STATE");

    if (args.to === "DELIVERED" && args.cashCollected && order.paymentMethod === "COD" && order.paymentStatus === "PENDING") {
      await recordCodPayment(tx, order, args.actor);
    }

    const updated = await tx.order.update({ where: { id: order.id }, data: { fulfillmentStatus: args.to } });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, kind: "FULFILLMENT", fromStatus: order.fulfillmentStatus, toStatus: args.to, note: args.note ?? null, actorId: args.actor.id, actorLabel: args.actor.label },
    });
    await enqueue(tx, order, templates.statusUpdate(mail(order), args.to, settings.businessName));
    await audit(args.actor, "order.status.update", "Order", order.id, { orderNumber: order.orderNumber, from: order.fulfillmentStatus, to: args.to, note: args.note ?? null }, tx, args.ip);
    return updated;
  });
}

async function recordCodPayment(tx: Tx, order: { id: string; totalPaise: number; paymentStatus: "PENDING" | "FAILED" | "PAID" | "REFUND_PENDING" | "PARTIALLY_REFUNDED" | "REFUNDED" }, actor: Actor) {
  const check = checkPaymentTransition(order.paymentStatus, "PAID");
  if (!check.ok) throw new OrderError(check.reason, "STATE");
  await tx.payment.create({
    data: { orderId: order.id, provider: "COD", amountPaise: order.totalPaise, status: "CAPTURED", method: "cash", capturedAt: new Date() },
  });
  await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", paidAt: new Date() } });
  await tx.orderStatusHistory.create({
    data: { orderId: order.id, kind: "PAYMENT", fromStatus: order.paymentStatus, toStatus: "PAID", note: "Cash collected on delivery", actorId: actor.id, actorLabel: actor.label },
  });
}

/** Mark a cash-on-delivery order as paid once the cash has actually been collected. */
export async function markCodPaid(args: { orderId: string; actor: Actor; ip?: string }) {
  return db.$transaction(async (tx) => {
    await lockOrder(tx, args.orderId);
    const order = await tx.order.findUnique({ where: { id: args.orderId } });
    if (!order) throw new OrderError("Order not found.", "NOT_FOUND");
    if (order.paymentMethod !== "COD") throw new OrderError("Only cash-on-delivery orders can be marked paid manually.", "STATE");
    if (order.fulfillmentStatus === "CANCELLED") throw new OrderError("This order is cancelled.", "STATE");
    await recordCodPayment(tx, order, args.actor);
    await audit(args.actor, "order.cod.paid", "Order", order.id, { orderNumber: order.orderNumber }, tx, args.ip);
  });
}

export async function saveAdminNote(args: { orderId: string; note: string; actor: Actor; ip?: string }) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.update({ where: { id: args.orderId }, data: { adminNote: args.note || null } });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, kind: "NOTE", toStatus: "ADMIN_NOTE", note: args.note || "(note cleared)", actorId: args.actor.id, actorLabel: args.actor.label, customerVisible: false },
    });
    await audit(args.actor, "order.note", "Order", order.id, { orderNumber: order.orderNumber }, tx, args.ip);
  });
}

// ───────────────────────────── Refunds ─────────────────────────────

/** Recompute the order's payment status from its refund rows. */
async function settleRefundStatus(tx: Tx, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { refunds: true } });
  const processed = order.refunds.filter((r) => r.status === "PROCESSED").reduce((s, r) => s + r.amountPaise, 0);
  const pending = order.refunds.some((r) => r.status === "PENDING");
  const next = pending ? "REFUND_PENDING" : processed >= order.totalPaise ? "REFUNDED" : processed > 0 ? "PARTIALLY_REFUNDED" : "PAID";
  if (next !== order.paymentStatus) {
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: next } });
    await tx.orderStatusHistory.create({
      data: { orderId, kind: "PAYMENT", fromStatus: order.paymentStatus, toStatus: next, note: "Refund status updated", actorLabel: "System" },
    });
  }
  return { order, next, processed };
}

/**
 * Issue a refund through the payment provider. Never automatic: an admin must request it explicitly with an
 * amount and a reason. The provider call happens OUTSIDE the database transaction; the refund row (with its
 * idempotency key) is committed first so a crash or double-click cannot produce two refunds.
 */
export async function refundOrder(args: {
  orderId: string;
  amountPaise: number;
  reason: string;
  idempotencyKey: string;
  actor: Actor;
  ip?: string;
}): Promise<{ refundId: string; status: "PENDING" | "PROCESSED" | "FAILED"; message?: string }> {
  const settings = await getSettings();

  // 1. Reserve the refund.
  const reserved = await db.$transaction(async (tx) => {
    // Lock first so a concurrent double-submit waits here, then finds the refund the first call created.
    await lockOrder(tx, args.orderId);
    const dup = await tx.refund.findUnique({ where: { idempotencyKey: args.idempotencyKey } });
    if (dup) return { kind: "dup", dup } as const;

    const order = await tx.order.findUnique({ where: { id: args.orderId }, include: { payments: true, refunds: true } });
    if (!order) throw new OrderError("Order not found.", "NOT_FOUND");
    if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
      throw new OrderError("Only paid orders can be refunded.", "STATE");
    }
    const payment = order.payments.filter((p) => p.status === "CAPTURED").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!payment) throw new OrderError("No captured payment found for this order.", "STATE");
    const committed = order.refunds.filter((r) => r.status !== "FAILED").reduce((s, r) => s + r.amountPaise, 0);
    const refundable = order.totalPaise - committed;
    if (args.amountPaise <= 0 || args.amountPaise > refundable) {
      throw new OrderError(`Refund must be between ₹0.01 and the refundable balance of ₹${(refundable / 100).toFixed(2)}.`, "STATE");
    }
    const refund = await tx.refund.create({
      data: { orderId: order.id, paymentId: payment.id, amountPaise: args.amountPaise, reason: args.reason, idempotencyKey: args.idempotencyKey, requestedById: args.actor.id },
    });
    const prev = order.paymentStatus;
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "REFUND_PENDING" } });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, kind: "PAYMENT", fromStatus: prev, toStatus: "REFUND_PENDING", note: args.reason, actorId: args.actor.id, actorLabel: args.actor.label },
    });
    await audit(args.actor, "order.refund.request", "Order", order.id, { orderNumber: order.orderNumber, amountPaise: args.amountPaise, reason: args.reason }, tx, args.ip);
    return { kind: "ok", refund, payment, order } as const;
  });

  if (reserved.kind === "dup") return { refundId: reserved.dup.id, status: reserved.dup.status };
  const { refund, payment, order } = reserved;

  // 2. Talk to the provider (outside the transaction).
  let providerRefundId: string | null = null;
  let providerStatus: "PROCESSED" | "PENDING" = "PROCESSED";
  let failure: string | null = null;
  try {
    if (payment.provider === "RAZORPAY") {
      if (!payment.providerPaymentId) throw new Error("Missing provider payment id");
      const r = await refundRazorpayPayment(payment.providerPaymentId, refund.amountPaise, refund.id);
      providerRefundId = r.id;
      providerStatus = r.status === "processed" ? "PROCESSED" : "PENDING";
    }
    // DEV and COD refunds are recorded directly (COD: the admin attests the cash was returned).
  } catch (e) {
    failure = e instanceof Error ? e.message : "Refund failed";
  }

  // 3. Settle.
  await db.$transaction(async (tx) => {
    await lockOrder(tx, order.id);
    await tx.refund.update({
      where: { id: refund.id },
      data: failure
        ? { status: "FAILED", failureReason: failure.slice(0, 300) }
        : { status: providerStatus, providerRefundId, processedAt: providerStatus === "PROCESSED" ? new Date() : null },
    });
    const { order: fresh } = await settleRefundStatus(tx, order.id);
    if (!failure) await enqueue(tx, fresh, templates.refund(mail(fresh), refund.amountPaise, providerStatus, settings.businessName));
    await audit(args.actor, failure ? "order.refund.failed" : "order.refund.settled", "Order", order.id, { refundId: refund.id, status: failure ? "FAILED" : providerStatus, failure }, tx, args.ip);
  });

  return failure
    ? { refundId: refund.id, status: "FAILED", message: failure }
    : { refundId: refund.id, status: providerStatus };
}

/** Webhook path: a provider reports that a refund has been processed. Idempotent. */
export async function finalizeRefundProcessed(providerRefundId: string) {
  await db.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({ where: { providerRefundId } });
    if (!refund || refund.status === "PROCESSED") return;
    await lockOrder(tx, refund.orderId);
    await tx.refund.update({ where: { id: refund.id }, data: { status: "PROCESSED", processedAt: new Date() } });
    await settleRefundStatus(tx, refund.orderId);
  });
}

/** Webhook path: the provider reports that a refund failed. Returns the order to its prior paid state. */
export async function finalizeRefundFailed(providerRefundId: string) {
  await db.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({ where: { providerRefundId } });
    if (!refund || refund.status === "FAILED") return;
    await lockOrder(tx, refund.orderId);
    await tx.refund.update({ where: { id: refund.id }, data: { status: "FAILED", failureReason: "Reported failed by payment provider" } });
    await settleRefundStatus(tx, refund.orderId);
  });
}
