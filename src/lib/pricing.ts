import type { CouponRule } from "./coupons";
import { couponDiscount } from "./coupons";

export type PricingLine = {
  key: string;
  productId: string;
  categoryId: string | null;
  unitPricePaise: number;
  quantity: number;
};

export type TaxConfig = { enabled: boolean; rateBp: number; inclusive: boolean };

export type PricingConfig = {
  deliveryFeePaise: number;
  freeDeliveryThresholdPaise: number | null;
  tax: TaxConfig;
};

export type PricingResult = {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  freeDeliveryApplied: boolean;
};

export const lineTotal = (l: Pick<PricingLine, "unitPricePaise" | "quantity">) => l.unitPricePaise * l.quantity;

/**
 * The single source of truth for order maths. Every value is integer paise.
 *   subtotal = sum(unit x qty)
 *   discount = coupon discount (never more than the eligible subtotal)
 *   shipping = configured fee, waived when (subtotal - discount) reaches the free-delivery threshold
 *   tax      = Inclusive: extracted from the goods value (total unchanged).
 *              Exclusive: added on top of the goods value.
 */
export function priceOrder(lines: PricingLine[], coupon: CouponRule | null, config: PricingConfig): PricingResult {
  const subtotalPaise = lines.reduce((s, l) => s + lineTotal(l), 0);
  const discountPaise = coupon ? Math.min(couponDiscount(lines, coupon), subtotalPaise) : 0;
  const goods = subtotalPaise - discountPaise;

  const threshold = config.freeDeliveryThresholdPaise;
  const freeDeliveryApplied = threshold != null && goods >= threshold && subtotalPaise > 0;
  const shippingPaise = lines.length === 0 || freeDeliveryApplied ? 0 : config.deliveryFeePaise;

  let taxPaise = 0;
  if (config.tax.enabled && config.tax.rateBp > 0) {
    taxPaise = config.tax.inclusive
      ? Math.round((goods * config.tax.rateBp) / (10000 + config.tax.rateBp))
      : Math.round((goods * config.tax.rateBp) / 10000);
  }

  const totalPaise = goods + shippingPaise + (config.tax.enabled && !config.tax.inclusive ? taxPaise : 0);
  return { subtotalPaise, discountPaise, shippingPaise, taxPaise, totalPaise, freeDeliveryApplied };
}
