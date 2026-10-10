import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage, whatsAppUrl } from "@/lib/whatsapp";
import { buildProductOrderBy, buildProductWhere, filtersToQuery, parseShopFilters, slugify } from "@/lib/catalog";
import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { can, isStaff } from "@/lib/auth/permissions";
import { paymentMode } from "@/lib/env";
import { checkoutSchema, normalizePhone } from "@/lib/checkout-schema";
import { deliveryFor, defaultSettings } from "@/lib/settings";

describe("WhatsApp message", () => {
  const base = {
    businessName: "DGAP Brownie Delight",
    lines: [
      { name: "Assorted Brownies", variantLabel: "1 kg", quantity: 2, unitPricePaise: 100_000 },
      { name: "Custom Brownie Box", variantLabel: "Box of 4", quantity: 1, unitPricePaise: 40_000, extras: ["2 x Classic Fudgy Brownie", "2 x Walnut"] },
    ],
    subtotalPaise: 240_000,
    discountPaise: 24_000,
    shippingPaise: 5_000,
    totalPaise: 221_000,
    couponCode: "SAVE10",
    deliveryLabel: "Standard delivery",
    deliveryArea: "560001",
  };

  it("labels an enquiry as NOT a confirmed order and lists every item", () => {
    const m = buildWhatsAppMessage(base);
    expect(m).toContain("enquiry, not a confirmed order");
    expect(m).toContain("1. Assorted Brownies (1 kg)");
    expect(m).toContain("Quantity: 2");
    expect(m).toContain("₹2,000");
    expect(m).toContain("2 x Classic Fudgy Brownie");
    expect(m).toContain("Discount (SAVE10): -₹240");
    expect(m).toContain("Delivery: Standard delivery (₹50)");
    expect(m).toContain("Total: ₹2,210");
    expect(m).not.toMatch(/\bpaid\b/i);
  });

  it("references the order number once an order exists", () => {
    const m = buildWhatsAppMessage({ ...base, orderNumber: "DGAP-1001" });
    expect(m).toContain("DGAP-1001");
    expect(m).not.toContain("enquiry, not a confirmed order");
  });

  it("builds a wa.me link only for a valid configured number", () => {
    expect(whatsAppUrl("919876543210", "Hi there")).toBe("https://wa.me/919876543210?text=Hi%20there");
    expect(whatsAppUrl(null, "x")).toBeNull();
    expect(whatsAppUrl("12", "x")).toBeNull();
    expect(whatsAppUrl("+91 98", "x")).toBeNull();
  });
});

describe("product filtering", () => {
  it("parses untrusted search params safely", () => {
    const f = parseShopFilters({ q: "  fudge ", category: "classic", min: "100", max: "50", sort: "price-asc", page: "2" });
    expect(f).toMatchObject({ q: "fudge", category: "classic", minPaise: 5_000, maxPaise: 10_000, sort: "price-asc", page: 2 });
  });
  it("drops invalid values instead of throwing", () => {
    expect(parseShopFilters({ sort: "hack", page: "-3", min: "abc" })).toMatchObject({ sort: "featured", page: 1 });
  });
  it("builds a where clause that only ever matches active products", () => {
    const w = buildProductWhere({ q: "wal", category: "nuts", minPaise: 10_000, maxPaise: 50_000 }) as { status: string; OR: unknown[]; category: unknown; variants: { some: { priceInPaise: unknown } } };
    expect(w.status).toBe("ACTIVE");
    expect(w.OR).toHaveLength(3);
    expect(w.category).toEqual({ slug: "nuts", isActive: true });
    expect(w.variants.some.priceInPaise).toEqual({ not: null, gte: 10_000, lte: 50_000 });
  });
  it("sorts by price with unpriced products last", () => {
    expect(buildProductOrderBy("price-asc")[0]).toEqual({ minPricePaise: { sort: "asc", nulls: "last" } });
  });
  it("round-trips filters to a clean query string", () => {
    expect(filtersToQuery({ q: "a", sort: "featured", page: 1 })).toBe("?q=a");
    expect(filtersToQuery({ category: "x", minPaise: 10_000, page: 3 })).toBe("?category=x&min=100&page=3");
  });
  it("slugifies names", () => expect(slugify("Chocolate Walnut Brownie!")).toBe("chocolate-walnut-brownie"));
});

describe("Razorpay signatures", () => {
  const secret = "test_secret_value";
  it("verifies a genuine checkout signature and rejects tampering", () => {
    const sig = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, secret)).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_2", sig, secret)).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, "other")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "short", secret)).toBe(false);
  });
  it("verifies the webhook signature over the raw body", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, secret)).toBe(false);
  });
});

describe("permissions", () => {
  it("customers have no admin permissions", () => {
    expect(can("CUSTOMER", "orders:read")).toBe(false);
    expect(isStaff("CUSTOMER")).toBe(false);
    expect(can(null, "orders:read")).toBe(false);
  });
  it("staff can run orders but not refund or change settings", () => {
    expect(can("STAFF", "orders:update")).toBe(true);
    expect(can("STAFF", "orders:refund")).toBe(false);
    expect(can("STAFF", "settings:write")).toBe(false);
    expect(can("STAFF", "audit:read")).toBe(false);
  });
  it("admins can do everything", () => {
    expect(can("ADMIN", "orders:refund")).toBe(true);
    expect(can("ADMIN", "settings:write")).toBe(true);
  });
});

describe("payment mode", () => {
  const e = (o: object) => ({ NODE_ENV: "development" as const, PAYMENT_MODE: undefined, RAZORPAY_KEY_ID: undefined, RAZORPAY_KEY_SECRET: undefined, ...o });
  it("uses razorpay when keys exist", () => expect(paymentMode(e({ RAZORPAY_KEY_ID: "a", RAZORPAY_KEY_SECRET: "b" }))).toBe("razorpay"));
  it("falls back to the dev simulator only outside production", () => {
    expect(paymentMode(e({}))).toBe("dev");
    expect(paymentMode(e({ NODE_ENV: "production" }))).toBe("off");
  });
  it("refuses dev mode in production even if requested", () => {
    expect(paymentMode(e({ NODE_ENV: "production", PAYMENT_MODE: "dev" }))).toBe("off");
  });
  it("does not claim razorpay without keys", () => expect(paymentMode(e({ PAYMENT_MODE: "razorpay" }))).toBe("off"));
});

describe("checkout validation", () => {
  const valid = {
    customerName: "Asha", customerPhone: "98765 43210", line1: "12 MG Road", city: "Bengaluru", postalCode: "560001",
    deliveryOptionId: "standard", paymentMethod: "ONLINE", idempotencyKey: "abcdefgh1234",
  };
  it("normalises Indian phone numbers", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("919876543210");
    expect(normalizePhone("09876543210")).toBe("919876543210");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("5876543210")).toBeNull();
  });
  it("accepts a valid form and rejects bad input", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...valid, postalCode: "12" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, customerPhone: "abc" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, customerEmail: "nope" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, paymentMethod: "BITCOIN" }).success).toBe(false);
  });
});

describe("delivery rules", () => {
  const s = { ...defaultSettings(), deliveryZones: [{ id: "blr", name: "Bengaluru", postalPrefixes: ["560"], feePaise: 4_000 }] };
  it("applies a zone fee override by postal prefix", () => {
    const r = deliveryFor(s, "standard", "560001");
    expect(r).toMatchObject({ ok: true, feePaise: 4_000 });
  });
  it("falls back to the option fee outside a zone", () => {
    expect(deliveryFor({ ...s, deliveryOptions: [{ ...s.deliveryOptions[0], feePaise: 9_900 }] }, "standard", "110001")).toMatchObject({ ok: true, feePaise: 9_900 });
  });
  it("can restrict ordering to delivery zones", () => {
    expect(deliveryFor({ ...s, restrictToZones: true }, "standard", "110001").ok).toBe(false);
  });
  it("rejects unknown or disabled options", () => {
    expect(deliveryFor(s, "teleport", "560001").ok).toBe(false);
  });
});
