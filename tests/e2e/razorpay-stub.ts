import { createHmac } from "node:crypto";
import type { Page } from "@playwright/test";
import { E2E_FAKE_RAZORPAY_PORT, E2E_RAZORPAY_KEY_SECRET } from "./constants";

export const fakeApi = `http://127.0.0.1:${E2E_FAKE_RAZORPAY_PORT}`;

export const signCheckout = (orderId: string, paymentId: string) =>
  createHmac("sha256", E2E_RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

export type StubMode = "success" | "failure" | "tampered-amount" | "bad-signature";

/**
 * Replaces Razorpay's browser checkout (which needs the internet) with a stub that behaves like it:
 * when "Pay" opens it, the stub registers a payment with the fake Razorpay API and either calls the
 * app's `handler` with a genuinely signed response, or fires the `payment.failed` event.
 * Everything after that (signature check, fetching the payment, amount check, marking paid) is the real server code.
 */
export async function installRazorpayStub(page: Page, mode: () => StubMode) {
  await page.exposeFunction("__rzPrepare", async (orderId: string) => {
    const m = mode();
    if (m === "failure") return { failed: true };
    const amountBody = m === "tampered-amount" ? { amount: 100 } : {};
    const res = await fetch(`${fakeApi}/__test/capture`, { method: "POST", body: JSON.stringify({ order_id: orderId, ...amountBody }) });
    const { payment_id } = (await res.json()) as { payment_id: string };
    return {
      failed: false,
      response: {
        razorpay_order_id: orderId,
        razorpay_payment_id: payment_id,
        razorpay_signature: m === "bad-signature" ? "0".repeat(64) : signCheckout(orderId, payment_id),
      },
    };
  });
  await page.addInitScript(() => {
    type Opts = { order_id: string; handler: (r: unknown) => void; modal?: { ondismiss?: () => void } };
    class FakeRazorpay {
      private listeners: Record<string, (r: unknown) => void> = {};
      constructor(private opts: Opts) {}
      on(event: string, cb: (r: unknown) => void) { this.listeners[event] = cb; }
      async open() {
        const r = await (window as unknown as { __rzPrepare: (id: string) => Promise<{ failed: boolean; response?: unknown }> }).__rzPrepare(this.opts.order_id);
        if (r.failed) this.listeners["payment.failed"]?.({ error: { description: "Payment failed (simulated by the test)" } });
        else this.opts.handler(r.response);
      }
    }
    (window as unknown as { Razorpay: unknown }).Razorpay = FakeRazorpay;
  });
}
