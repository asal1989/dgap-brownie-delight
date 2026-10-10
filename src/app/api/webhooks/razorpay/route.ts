import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { env } from "@/lib/env";
import { processNotifications } from "@/lib/notify";
import { handleRazorpayWebhook } from "@/lib/payments/webhook";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook. The signature is verified over the RAW body (so we read text, not JSON), events are
 * de-duplicated by Razorpay's event id, and processing is idempotent. Non-2xx responses make Razorpay retry.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  try {
    const result = await handleRazorpayWebhook({
      rawBody,
      signature: req.headers.get("x-razorpay-signature"),
      eventId: req.headers.get("x-razorpay-event-id"),
      secret: env().RAZORPAY_WEBHOOK_SECRET,
    });
    if (result.status === 200) after(() => processNotifications().catch(() => undefined));
    return new NextResponse(result.body, { status: result.status });
  } catch (e) {
    console.error("[razorpay-webhook] processing failed", e);
    return new NextResponse("Processing error", { status: 500 });
  }
}
