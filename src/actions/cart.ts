"use server";

import { db } from "@/lib/db";
import { paymentMode } from "@/lib/env";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cartSchema, quoteCart, type Quote } from "@/lib/quote";
import { getSettings, resolveWhatsAppNumber } from "@/lib/settings";
import { clientIp, getCurrentUser } from "@/lib/auth/session";
import { buildWhatsAppMessage, whatsAppUrl } from "@/lib/whatsapp";

export type StoreConfig = {
  orderingEnabled: boolean;
  closedMessage: string;
  codEnabled: boolean;
  onlinePaymentAvailable: boolean;
  devPayment: boolean;
  deliveryOptions: { id: string; label: string; description: string; feePaise: number }[];
  freeDeliveryThresholdPaise: number | null;
  tax: { enabled: boolean; label: string; inclusive: boolean };
  whatsappConfigured: boolean;
};

async function storeConfig(): Promise<StoreConfig> {
  const s = await getSettings();
  const mode = paymentMode();
  return {
    orderingEnabled: s.orderingEnabled,
    closedMessage: s.orderingClosedMessage,
    codEnabled: s.codEnabled,
    onlinePaymentAvailable: s.onlinePaymentEnabled && mode !== "off",
    devPayment: mode === "dev",
    deliveryOptions: s.deliveryOptions.filter((o) => o.enabled).map(({ id, label, description, feePaise }) => ({ id, label, description, feePaise })),
    freeDeliveryThresholdPaise: s.freeDeliveryThresholdPaise,
    tax: { enabled: s.tax.enabled, label: s.tax.label, inclusive: s.tax.inclusive },
    whatsappConfigured: resolveWhatsAppNumber(s) !== null,
  };
}

type QuoteOpts = { deliveryOptionId?: string; postalCode?: string };

/** Authoritative cart pricing for the cart and checkout pages. The browser sends ids and quantities only. */
export async function quoteCartAction(
  rawCart: unknown,
  opts: QuoteOpts = {},
): Promise<{ ok: true; quote: Quote; config: StoreConfig } | { ok: false; error: string }> {
  const parsed = cartSchema.safeParse(rawCart);
  if (!parsed.success) return { ok: false, error: "Your cart could not be read. Please refresh the page." };
  if (parsed.data.couponCode) {
    const limit = await rateLimit(`coupon:${await clientIp()}`, LIMITS.coupon);
    if (!limit.ok) return { ok: false, error: "Too many coupon attempts. Please try again in a few minutes." };
  }
  const [settings, user, config] = await Promise.all([getSettings(), getCurrentUser(), storeConfig()]);
  const quote = await quoteCart(db, parsed.data, {
    settings,
    customerKey: user?.id ?? null,
    deliveryOptionId: opts.deliveryOptionId,
    postalCode: opts.postalCode,
  });
  return { ok: true, quote, config };
}

/** Build a WhatsApp enquiry for the current cart. This is an enquiry, never a confirmed or paid order. */
export async function whatsappEnquiryAction(
  rawCart: unknown,
  opts: QuoteOpts & { name?: string } = {},
): Promise<{ ok: true; url: string | null; message: string } | { ok: false; error: string }> {
  const parsed = cartSchema.safeParse(rawCart);
  if (!parsed.success || parsed.data.items.length === 0) return { ok: false, error: "Your cart is empty." };
  const settings = await getSettings();
  const quote = await quoteCart(db, parsed.data, { settings, deliveryOptionId: opts.deliveryOptionId, postalCode: opts.postalCode });
  if (quote.lines.length === 0) return { ok: false, error: quote.issues[0] ?? "Nothing in your cart can be ordered right now." };
  const message = buildWhatsAppMessage({
    businessName: settings.businessName,
    lines: quote.lines.map((l) => ({
      name: l.productName,
      variantLabel: l.variantLabel,
      quantity: l.quantity,
      unitPricePaise: l.unitPricePaise,
      extras: l.selections?.map((s) => `${s.quantity} x ${s.name}`),
    })),
    subtotalPaise: quote.pricing.subtotalPaise,
    discountPaise: quote.pricing.discountPaise,
    shippingPaise: quote.pricing.shippingPaise,
    totalPaise: quote.pricing.totalPaise,
    couponCode: quote.coupon?.code ?? null,
    deliveryLabel: quote.delivery?.label ?? null,
    deliveryArea: opts.postalCode ?? null,
    customerName: opts.name ?? null,
  });
  return { ok: true, url: whatsAppUrl(resolveWhatsAppNumber(settings), message), message };
}

/** Enquiry about a single product (no cart needed). */
export async function productEnquiryAction(slug: string, variantLabel?: string): Promise<{ url: string | null; message: string }> {
  const settings = await getSettings();
  const product = await db.product.findFirst({ where: { slug, status: "ACTIVE" }, select: { name: true } });
  const message = `Hello ${settings.businessName}! This is an enquiry, not an order. I would like to know the price and availability of ${product?.name ?? "your brownies"}${variantLabel ? ` (${variantLabel})` : ""}.`;
  return { url: whatsAppUrl(resolveWhatsAppNumber(settings), message), message };
}

/** WhatsApp enquiry for a custom box. Works even before a box size has a price (price is then "to be confirmed"). */
export async function boxEnquiryAction(
  variantId: string,
  selections: { productId: string; quantity: number }[],
): Promise<{ ok: true; url: string | null; message: string } | { ok: false; error: string }> {
  const settings = await getSettings();
  const variant = await db.productVariant.findFirst({ where: { id: variantId, archivedAt: null, product: { kind: "CUSTOM_BOX", status: "ACTIVE" } } });
  if (!variant) return { ok: false, error: "Please choose a box size." };
  const ids = selections.filter((s) => Number.isInteger(s.quantity) && s.quantity > 0 && s.quantity <= 50).map((s) => s.productId);
  const products = await db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, select: { id: true, name: true } });
  const lines = selections
    .map((s) => ({ s, p: products.find((p) => p.id === s.productId) }))
    .filter((x) => x.p)
    .map((x) => `${x.s.quantity} x ${x.p!.name}`);
  const message = [
    `Hello ${settings.businessName}!`,
    "This is an enquiry, not a confirmed order. I would like a custom brownie box:",
    "",
    `Box size: ${variant.label}${variant.pieces ? ` (${variant.pieces} brownies)` : ""}`,
    ...lines.map((l) => `- ${l}`),
    "",
    variant.priceInPaise != null ? `Box price: ₹${(variant.priceInPaise / 100).toLocaleString("en-IN")}` : "Please confirm the price.",
    "Please confirm availability, delivery and payment details.",
  ].join("\n");
  return { ok: true, url: whatsAppUrl(resolveWhatsAppNumber(settings), message), message };
}
