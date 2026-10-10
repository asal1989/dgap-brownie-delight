import { describe, expect, it } from "vitest";
import { formatINR, paiseToRupeesInput, rupeesToPaise } from "@/lib/money";
import { priceOrder, type PricingConfig, type PricingLine } from "@/lib/pricing";
import { checkCoupon, couponDiscount, normalizeCouponCode, type CouponState } from "@/lib/coupons";

const line = (over: Partial<PricingLine> = {}): PricingLine => ({
  key: "a",
  productId: "p1",
  categoryId: "c1",
  unitPricePaise: 100_000,
  quantity: 1,
  ...over,
});

const config = (over: Partial<PricingConfig> = {}): PricingConfig => ({
  deliveryFeePaise: 5_000,
  freeDeliveryThresholdPaise: null,
  tax: { enabled: false, rateBp: 0, inclusive: true },
  ...over,
});

const coupon = (over: Partial<CouponState> = {}): CouponState => ({
  id: "k1",
  code: "SAVE10",
  type: "PERCENT",
  value: 10,
  maxDiscountPaise: null,
  minOrderPaise: 0,
  productIds: [],
  categoryIds: [],
  isActive: true,
  startsAt: null,
  expiresAt: null,
  usageLimit: null,
  usedCount: 0,
  perCustomerLimit: null,
  ...over,
});

describe("money", () => {
  it("formats paise as Indian rupees", () => {
    expect(formatINR(100_000)).toBe("₹1,000");
    expect(formatINR(24_950)).toBe("₹249.50");
    expect(formatINR(123_456_700)).toBe("₹12,34,567");
  });

  it("parses admin rupee input into integer paise", () => {
    expect(rupeesToPaise("1000")).toBe(100_000);
    expect(rupeesToPaise("1,000.5")).toBe(100_050);
    expect(rupeesToPaise("249.99")).toBe(24_999);
    expect(rupeesToPaise("₹ 10")).toBe(1_000);
  });

  it("rejects malformed amounts instead of guessing", () => {
    for (const bad of ["", "-5", "1.234", "abc", "1e3", "1..0", "0x10"]) expect(rupeesToPaise(bad)).toBeNull();
  });

  it("round-trips paise to an editable string", () => {
    expect(paiseToRupeesInput(100_000)).toBe("1000");
    expect(paiseToRupeesInput(24_905)).toBe("249.05");
    expect(paiseToRupeesInput(null)).toBe("");
  });

  it("never produces fractional paise (no float drift)", () => {
    expect(rupeesToPaise("0.1")! + rupeesToPaise("0.2")!).toBe(30);
  });
});

describe("priceOrder", () => {
  it("sums lines, adds delivery, no discount", () => {
    const r = priceOrder([line({ quantity: 2 }), line({ key: "b", unitPricePaise: 5_050 })], null, config());
    expect(r).toMatchObject({ subtotalPaise: 205_050, discountPaise: 0, shippingPaise: 5_000, totalPaise: 210_050 });
  });

  it("applies a percentage coupon, rounded down to whole paise", () => {
    const r = priceOrder([line({ unitPricePaise: 33_333 })], coupon({ value: 10 }), config());
    expect(r.discountPaise).toBe(3_333); // floor(3333.3)
    expect(r.totalPaise).toBe(33_333 - 3_333 + 5_000);
  });

  it("caps percentage coupons at maxDiscountPaise", () => {
    expect(couponDiscount([line()], coupon({ value: 50, maxDiscountPaise: 10_000 }))).toBe(10_000);
  });

  it("never discounts more than the eligible subtotal", () => {
    const r = priceOrder([line({ unitPricePaise: 5_000 })], coupon({ type: "FIXED", value: 999_999 }), config({ deliveryFeePaise: 0 }));
    expect(r.discountPaise).toBe(5_000);
    expect(r.totalPaise).toBe(0);
  });

  it("restricts coupons to eligible products or categories", () => {
    const lines = [line({ key: "a", productId: "p1", unitPricePaise: 10_000 }), line({ key: "b", productId: "p2", categoryId: "c2", unitPricePaise: 20_000 })];
    expect(couponDiscount(lines, coupon({ value: 50, productIds: ["p2"] }))).toBe(10_000);
    expect(couponDiscount(lines, coupon({ value: 50, categoryIds: ["c1"] }))).toBe(5_000);
  });

  it("waives delivery once the discounted goods reach the free-delivery threshold", () => {
    const cfg = config({ freeDeliveryThresholdPaise: 100_000 });
    expect(priceOrder([line()], null, cfg).shippingPaise).toBe(0);
    // A coupon can drop the order back under the threshold.
    expect(priceOrder([line()], coupon({ value: 10 }), cfg).shippingPaise).toBe(5_000);
  });

  it("charges no delivery for an empty cart", () => {
    expect(priceOrder([], null, config()).totalPaise).toBe(0);
  });

  it("extracts inclusive tax without changing the total", () => {
    const r = priceOrder([line({ unitPricePaise: 10_500 })], null, config({ deliveryFeePaise: 0, tax: { enabled: true, rateBp: 500, inclusive: true } }));
    expect(r.taxPaise).toBe(500);
    expect(r.totalPaise).toBe(10_500);
  });

  it("adds exclusive tax on top of the goods value", () => {
    const r = priceOrder([line({ unitPricePaise: 10_000 })], null, config({ deliveryFeePaise: 0, tax: { enabled: true, rateBp: 1800, inclusive: false } }));
    expect(r.taxPaise).toBe(1_800);
    expect(r.totalPaise).toBe(11_800);
  });
});

describe("checkCoupon", () => {
  const base = { now: new Date("2026-06-01T00:00:00Z"), lines: [line()], subtotalPaise: 100_000, customerRedemptions: 0 };

  it("accepts a valid coupon", () => expect(checkCoupon(coupon(), base)).toEqual({ ok: true }));
  it("rejects inactive, not-started and expired coupons", () => {
    expect(checkCoupon(coupon({ isActive: false }), base).ok).toBe(false);
    expect(checkCoupon(coupon({ startsAt: new Date("2026-07-01") }), base).ok).toBe(false);
    expect(checkCoupon(coupon({ expiresAt: new Date("2026-05-31") }), base).ok).toBe(false);
  });
  it("enforces total and per-customer usage limits", () => {
    expect(checkCoupon(coupon({ usageLimit: 5, usedCount: 5 }), base).ok).toBe(false);
    expect(checkCoupon(coupon({ perCustomerLimit: 1 }), { ...base, customerRedemptions: 1 }).ok).toBe(false);
    expect(checkCoupon(coupon({ perCustomerLimit: 2 }), { ...base, customerRedemptions: 1 }).ok).toBe(true);
  });
  it("enforces the minimum order value", () => {
    expect(checkCoupon(coupon({ minOrderPaise: 200_000 }), base).ok).toBe(false);
  });
  it("rejects coupons that match nothing in the cart", () => {
    expect(checkCoupon(coupon({ productIds: ["zzz"] }), base).ok).toBe(false);
  });
  it("normalises codes", () => expect(normalizeCouponCode("  save 10 ")).toBe("SAVE10"));
});
