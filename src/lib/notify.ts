import { db, type DbClient } from "./db";
import { env } from "./env";
import { formatINR } from "./money";
import { FULFILLMENT_LABEL } from "./order-state";
import type { FulfillmentStatus } from "@/generated/prisma/enums";

/**
 * Notifications use a transactional outbox: a row is written in the SAME transaction as the change that
 * triggers it, then delivered (and retried) out of band. A failing email provider can therefore never
 * roll back or corrupt an order.
 */

export type OrderMailInfo = {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  totalPaise: number;
};

type Queued = { type: string; subject: string; body: string };

const sign = (businessName: string) => `\n\nWith thanks,\n${businessName}`;

export const templates = {
  orderPlaced: (o: OrderMailInfo, biz: string): Queued => ({
    type: "order.placed",
    subject: `We received your order ${o.orderNumber}`,
    body: `Hi ${o.customerName},\n\nThank you for your order ${o.orderNumber} (${formatINR(o.totalPaise)}). We will keep you posted as it progresses.${sign(biz)}`,
  }),
  paymentConfirmed: (o: OrderMailInfo, biz: string): Queued => ({
    type: "payment.confirmed",
    subject: `Payment received for ${o.orderNumber}`,
    body: `Hi ${o.customerName},\n\nWe have received your payment of ${formatINR(o.totalPaise)} for order ${o.orderNumber}. Your order is confirmed.${sign(biz)}`,
  }),
  statusUpdate: (o: OrderMailInfo, to: FulfillmentStatus, biz: string): Queued => ({
    type: "order.status",
    subject: `Order ${o.orderNumber}: ${FULFILLMENT_LABEL[to]}`,
    body: `Hi ${o.customerName},\n\nYour order ${o.orderNumber} is now: ${FULFILLMENT_LABEL[to]}.${sign(biz)}`,
  }),
  cancelled: (o: OrderMailInfo, reason: string | null, biz: string): Queued => ({
    type: "order.cancelled",
    subject: `Order ${o.orderNumber} was cancelled`,
    body: `Hi ${o.customerName},\n\nYour order ${o.orderNumber} has been cancelled.${reason ? `\nReason: ${reason}` : ""}\nIf you paid online, any refund will be confirmed to you separately.${sign(biz)}`,
  }),
  refund: (o: OrderMailInfo, amountPaise: number, status: "PENDING" | "PROCESSED", biz: string): Queued => ({
    type: "refund.update",
    subject: `Refund ${status === "PROCESSED" ? "processed" : "initiated"} for ${o.orderNumber}`,
    body: `Hi ${o.customerName},\n\nA refund of ${formatINR(amountPaise)} for order ${o.orderNumber} has been ${status === "PROCESSED" ? "processed" : "initiated"}. It can take a few working days to reach your account.${sign(biz)}`,
  }),
};

/** Queue an email inside the caller's transaction. No-op when the order has no email address. */
export async function enqueue(client: DbClient, order: { id: string; customerEmail: string | null }, msg: Queued) {
  if (!order.customerEmail) return;
  await client.notification.create({
    data: { type: msg.type, toEmail: order.customerEmail, subject: msg.subject, body: msg.body, orderId: order.id },
  });
}

async function sendViaResend(n: { toEmail: string; subject: string; body: string }): Promise<void> {
  const e = env();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: e.EMAIL_FROM ?? "DGAP Brownie Delight <onboarding@resend.dev>", to: [n.toEmail], subject: n.subject, text: n.body }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

const MAX_ATTEMPTS = 5;

/**
 * Deliver due notifications. Safe to run concurrently (rows are claimed with SKIP LOCKED) and to retry.
 * Without an email provider rows are marked SKIPPED, so nothing is silently "sent".
 */
export async function processNotifications(limit = 20): Promise<{ sent: number; failed: number; skipped: number }> {
  const e = env();
  const result = { sent: 0, failed: 0, skipped: 0 };
  const claimed = await db.$queryRaw<{ id: string }[]>`
    UPDATE "Notification" SET "attempts" = "attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "Notification"
      WHERE "status" = 'PENDING' AND "nextAttemptAt" <= NOW()
      ORDER BY "createdAt" LIMIT ${limit} FOR UPDATE SKIP LOCKED)
    RETURNING "id"`;
  for (const { id } of claimed) {
    const n = await db.notification.findUnique({ where: { id } });
    if (!n) continue;
    try {
      if (e.RESEND_API_KEY) {
        await sendViaResend(n);
        await db.notification.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
        result.sent++;
      } else {
        if (e.NOTIFICATIONS_DEV_LOG && e.NODE_ENV !== "production") {
          console.log(`[notification:dev-log] to=${n.toEmail} subject="${n.subject}"\n${n.body}`);
        }
        await db.notification.update({ where: { id }, data: { status: "SKIPPED", lastError: "No email provider configured" } });
        result.skipped++;
      }
    } catch (err) {
      const exhausted = n.attempts >= MAX_ATTEMPTS;
      await db.notification.update({
        where: { id },
        data: {
          status: exhausted ? "FAILED" : "PENDING",
          lastError: err instanceof Error ? err.message.slice(0, 300) : "unknown error",
          nextAttemptAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** n.attempts) * 1000),
        },
      });
      result.failed++;
    }
  }
  return result;
}
