import "server-only";
import crypto from "node:crypto";
import type { PaymentProvider, PaymentMethodId } from "./types";

const cod: PaymentProvider = {
  id: "COD",
  label: "Cash on Delivery",
  description: "Pay when your brownies arrive.",
  isAvailable: ({ codEnabled }) => codEnabled,
  async createIntent() {
    return { kind: "none" };
  },
};

function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret ? { keyId, keySecret } : null;
}

const razorpay: PaymentProvider = {
  id: "RAZORPAY",
  label: "Pay online",
  description: "UPI, cards and netbanking via Razorpay.",
  isAvailable: () => razorpayKeys() !== null,
  async createIntent(ctx) {
    const keys = razorpayKeys();
    if (!keys) throw new Error("Razorpay is not configured");
    const amountPaise = ctx.amount * 100;
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64"),
      },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: ctx.orderNumber }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Razorpay order creation failed (${res.status})`);
    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new Error("Razorpay returned no order id");
    return {
      kind: "razorpay",
      keyId: keys.keyId,
      razorpayOrderId: data.id,
      amountPaise,
      currency: "INR",
      providerOrderId: data.id,
    };
  },
};

/** Placeholder so UPI can be added later. Never available until a real integration exists. */
const upi: PaymentProvider = {
  id: "UPI",
  label: "UPI",
  description: "Direct UPI payments.",
  isAvailable: () => false,
  async createIntent() {
    throw new Error("UPI is not configured");
  },
};

const PROVIDERS: Record<PaymentMethodId, PaymentProvider> = { COD: cod, RAZORPAY: razorpay, UPI: upi };

export function getProvider(id: PaymentMethodId): PaymentProvider {
  return PROVIDERS[id];
}

export function listAvailableProviders(opts: { codEnabled: boolean }) {
  return Object.values(PROVIDERS)
    .filter((p) => p.isAvailable(opts))
    .map((p) => ({ id: p.id, label: p.label, description: p.description }));
}

/** Verifies Razorpay's HMAC signature. Only a `true` result may mark a payment as PAID. */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const keys = razorpayKeys();
  if (!keys) return false;
  const expected = crypto.createHmac("sha256", keys.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
