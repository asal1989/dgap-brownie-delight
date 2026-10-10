import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

/**
 * Minimal Razorpay REST client + signature helpers. Uses plain `fetch`, so there is no SDK dependency.
 * All credentials come from environment variables.
 */

const DEFAULT_API = "https://api.razorpay.com/v1";
const apiBase = () => (env().RAZORPAY_API_BASE ?? DEFAULT_API).replace(/\/+$/, "");

function creds() {
  const { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: secret } = env();
  if (!id || !secret) throw new Error("Razorpay credentials are not configured");
  return { id, secret };
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { id, secret } = creds();
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new Error(json.error?.description ?? `Razorpay error ${res.status}`);
  return json;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string; receipt: string | null };
export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  error_code?: string | null;
  error_description?: string | null;
};
export type RazorpayRefund = { id: string; payment_id: string; amount: number; status: string };

export const createRazorpayOrder = (amountPaise: number, receipt: string) =>
  call<RazorpayOrder>("POST", "/orders", { amount: amountPaise, currency: "INR", receipt, payment_capture: 1 });

export const fetchRazorpayPayment = (paymentId: string) => call<RazorpayPayment>("GET", `/payments/${encodeURIComponent(paymentId)}`);

export const refundRazorpayPayment = (paymentId: string, amountPaise: number, receipt: string) =>
  call<RazorpayRefund>("POST", `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, receipt });

export const razorpayKeyId = () => creds().id;

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Checkout callback signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256 of the RAW request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
