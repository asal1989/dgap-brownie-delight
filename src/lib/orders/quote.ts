import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getSettings } from "@/lib/config";
import { calcCouponDiscount, calcDeliveryFee } from "@/lib/pricing";
import type { CartItemsInput } from "@/lib/validation/checkout";

export interface QuoteLine {
  productId: string;
  name: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
}

export type Quote =
  | {
      ok: true;
      lines: QuoteLine[];
      subtotal: number;
      discount: number;
      deliveryFee: number;
      total: number;
      couponId: string | null;
      couponCode: string | null;
      couponMessage: string | null;
    }
  | { ok: false; error: string };

/** Single source of truth for pricing. Never trusts prices sent by the client. */
export async function computeQuote(items: CartItemsInput, couponCode?: string): Promise<Quote> {
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantity);

  const products = await prisma.product.findMany({
    where: { id: { in: [...merged.keys()] }, isActive: true, category: { isActive: true } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: QuoteLine[] = [];
  for (const [productId, quantity] of merged) {
    const p = byId.get(productId);
    if (!p) return { ok: false, error: "An item in your cart is no longer available. Please review your cart." };
    if (p.stock < quantity) {
      return {
        ok: false,
        error: p.stock > 0 ? `Only ${p.stock} of "${p.name}" left in stock.` : `"${p.name}" is currently out of stock.`,
      };
    }
    lines.push({ productId, name: p.name, image: p.images[0] ?? null, unitPrice: p.price, quantity });
  }

  const settings = await getSettings();
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  if (settings.minimumOrderNum > 0 && subtotal < settings.minimumOrderNum) {
    return { ok: false, error: `The minimum order value is ₹${settings.minimumOrderNum}.` };
  }

  let discount = 0;
  let couponId: string | null = null;
  let appliedCode: string | null = null;
  let couponMessage: string | null = null;
  const code = couponCode?.trim().toUpperCase();
  if (code) {
    const c = await prisma.coupon.findUnique({ where: { code } });
    if (!c || !c.isActive) couponMessage = "This coupon code is not valid.";
    else if (c.expiresAt && c.expiresAt < new Date()) couponMessage = "This coupon has expired.";
    else if (c.usageLimit != null && c.usedCount >= c.usageLimit) couponMessage = "This coupon has reached its usage limit.";
    else if (subtotal < c.minimumOrder) couponMessage = `Add ₹${c.minimumOrder - subtotal} more to use this coupon.`;
    else {
      discount = calcCouponDiscount(subtotal, c);
      couponId = c.id;
      appliedCode = c.code;
    }
  }

  const deliveryFee = calcDeliveryFee(subtotal - discount, {
    deliveryFee: settings.deliveryFeeNum,
    freeDeliveryThreshold: settings.freeDeliveryThresholdNum,
  });
  return {
    ok: true,
    lines,
    subtotal,
    discount,
    deliveryFee,
    total: subtotal - discount + deliveryFee,
    couponId,
    couponCode: appliedCode,
    couponMessage,
  };
}
