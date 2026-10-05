export interface DeliveryRules {
  deliveryFee: number;
  freeDeliveryThreshold: number; // 0 = no free-delivery rule
}

export function calcDeliveryFee(subtotalAfterDiscount: number, rules: DeliveryRules): number {
  if (subtotalAfterDiscount <= 0) return 0;
  if (rules.freeDeliveryThreshold > 0 && subtotalAfterDiscount >= rules.freeDeliveryThreshold) return 0;
  return rules.deliveryFee;
}

export interface CouponRule {
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minimumOrder: number;
  maximumDiscount: number | null;
}

export function calcCouponDiscount(subtotal: number, c: CouponRule): number {
  if (subtotal < c.minimumOrder) return 0;
  let d = c.discountType === "PERCENTAGE" ? Math.round((subtotal * c.discountValue) / 100) : c.discountValue;
  if (c.maximumDiscount != null) d = Math.min(d, c.maximumDiscount);
  return Math.max(0, Math.min(d, subtotal));
}
