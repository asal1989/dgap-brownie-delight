import type { PricingLine } from "./pricing";

export type CouponRule = {
  code: string;
  type: "PERCENT" | "FIXED";
  /** PERCENT: 1-100.  FIXED: paise. */
  value: number;
  maxDiscountPaise: number | null;
  minOrderPaise: number;
  productIds: string[];
  categoryIds: string[];
};

export type CouponState = CouponRule & {
  id: string;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  perCustomerLimit: number | null;
};

export type CouponCheck = { ok: true } | { ok: false; reason: string };

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

/** Lines the coupon applies to (all lines when it has no product/category restriction). */
export function eligibleLines(lines: PricingLine[], c: Pick<CouponRule, "productIds" | "categoryIds">): PricingLine[] {
  if (c.productIds.length === 0 && c.categoryIds.length === 0) return lines;
  return lines.filter(
    (l) => c.productIds.includes(l.productId) || (l.categoryId != null && c.categoryIds.includes(l.categoryId)),
  );
}

/** Discount in paise for the given lines. Percentages round down so the customer is never over-discounted. */
export function couponDiscount(lines: PricingLine[], c: CouponRule): number {
  const eligible = eligibleLines(lines, c).reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
  if (eligible <= 0) return 0;
  if (c.type === "FIXED") return Math.min(c.value, eligible);
  let discount = Math.floor((eligible * c.value) / 100);
  if (c.maxDiscountPaise != null) discount = Math.min(discount, c.maxDiscountPaise);
  return Math.min(discount, eligible);
}

/** Validate every coupon rule except the live redemption counts, which the caller supplies. */
export function checkCoupon(
  c: CouponState,
  ctx: { now: Date; lines: PricingLine[]; subtotalPaise: number; customerRedemptions: number },
): CouponCheck {
  if (!c.isActive) return { ok: false, reason: "This coupon is not active." };
  if (c.startsAt && ctx.now < c.startsAt) return { ok: false, reason: "This coupon is not valid yet." };
  if (c.expiresAt && ctx.now > c.expiresAt) return { ok: false, reason: "This coupon has expired." };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) {
    return { ok: false, reason: "This coupon has reached its usage limit." };
  }
  if (c.perCustomerLimit != null && ctx.customerRedemptions >= c.perCustomerLimit) {
    return { ok: false, reason: "You have already used this coupon the maximum number of times." };
  }
  if (ctx.subtotalPaise < c.minOrderPaise) {
    return { ok: false, reason: "Your order does not reach this coupon's minimum amount." };
  }
  if (eligibleLines(ctx.lines, c).length === 0) {
    return { ok: false, reason: "This coupon does not apply to the items in your cart." };
  }
  return { ok: true };
}
