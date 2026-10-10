import { createHash } from "node:crypto";
import { db } from "../db";
import { applyPaymentCaptured, applyPaymentFailed } from "../orders";
import { finalizeRefundFailed, finalizeRefundProcessed } from "../order-admin";
import { verifyWebhookSignature } from "./razorpay";

type Entity = Record<string, unknown>;
type WebhookPayload = {
  event?: string;
  payload?: { payment?: { entity?: Entity }; refund?: { entity?: Entity }; order?: { entity?: Entity } };
};

export type WebhookResult = { status: number; body: string };

/**
 * Process a Razorpay webhook.
 *  - The signature is verified over the RAW body before anything is parsed or stored.
 *  - Each provider event id is recorded once; a re-delivered event that already finished is acknowledged
 *    without being processed again. Events that crashed mid-way are retried (handlers are idempotent too).
 */
export async function handleRazorpayWebhook(args: {
  rawBody: string;
  signature: string | null;
  eventId: string | null;
  secret: string | undefined;
}): Promise<WebhookResult> {
  if (!args.secret) return { status: 503, body: "Webhook secret is not configured" };
  if (!args.signature || !verifyWebhookSignature(args.rawBody, args.signature, args.secret)) {
    return { status: 401, body: "Invalid signature" };
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(args.rawBody) as WebhookPayload;
  } catch {
    return { status: 400, body: "Invalid JSON" };
  }
  const type = payload.event ?? "unknown";
  const eventId = args.eventId || createHash("sha256").update(args.rawBody).digest("hex");

  const record = await db.webhookEvent.upsert({
    where: { provider_eventId: { provider: "razorpay", eventId } },
    create: { provider: "razorpay", eventId, type },
    update: {},
  });
  if (record.processedAt) return { status: 200, body: "Duplicate event ignored" };

  const payment = payload.payload?.payment?.entity;
  const refund = payload.payload?.refund?.entity;

  switch (type) {
    case "payment.captured":
    case "order.paid": {
      const p = payment ?? undefined;
      if (p && typeof p.order_id === "string" && typeof p.id === "string") {
        await applyPaymentCaptured({
          providerOrderId: p.order_id,
          providerPaymentId: p.id,
          amountPaise: Number(p.amount),
          currency: String(p.currency ?? ""),
          method: typeof p.method === "string" ? p.method : null,
          actorLabel: "Razorpay webhook",
        });
      }
      break;
    }
    case "payment.failed": {
      if (payment && typeof payment.order_id === "string") {
        await applyPaymentFailed({
          providerOrderId: payment.order_id,
          code: typeof payment.error_code === "string" ? payment.error_code : null,
          reason: typeof payment.error_description === "string" ? payment.error_description : null,
        });
      }
      break;
    }
    case "refund.processed":
      if (refund && typeof refund.id === "string") await finalizeRefundProcessed(refund.id);
      break;
    case "refund.failed":
      if (refund && typeof refund.id === "string") await finalizeRefundFailed(refund.id);
      break;
    default:
      break; // acknowledged, nothing to do
  }

  await db.webhookEvent.update({ where: { id: record.id }, data: { processedAt: new Date() } });
  return { status: 200, body: "OK" };
}
