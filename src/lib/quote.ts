import { createHash } from "node:crypto";
import { z } from "zod";
import type { DbClient } from "./db";
import { checkCoupon, normalizeCouponCode, type CouponState } from "./coupons";
import { deliveryFor, type Settings } from "./settings";
import { priceOrder, type PricingLine, type PricingResult } from "./pricing";

export const MAX_LINE_QTY = 50;
export const MAX_BOX_QTY = 10;
export const MAX_LINES = 30;

export const cartItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("product"),
    variantId: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(MAX_LINE_QTY),
  }),
  z.object({
    type: z.literal("box"),
    variantId: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(MAX_BOX_QTY),
    selections: z
      .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(MAX_LINE_QTY) }))
      .min(1)
      .max(20),
  }),
]);

export const cartSchema = z.object({
  items: z.array(cartItemSchema).max(MAX_LINES),
  couponCode: z.string().trim().max(40).optional(),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;
export type CartInput = z.infer<typeof cartSchema>;

export type QuoteLine = {
  key: string;
  type: "product" | "box";
  variantId: string;
  productId: string;
  categoryId: string | null;
  productName: string;
  productSlug: string;
  variantLabel: string;
  sku: string;
  imageUrl: string | null;
  /** Whether stock is counted for this variant. */
  tracked: boolean;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  selections?: { productId: string; name: string; quantity: number }[];
};

export type Quote = {
  lines: QuoteLine[];
  /** Problems that block checkout, e.g. out-of-stock. Each names the item. */
  issues: string[];
  pricing: PricingResult;
  coupon: { id: string; code: string; discountPaise: number } | null;
  couponError: string | null;
  delivery: { optionId: string; label: string; feePaise: number } | null;
  deliveryError: string | null;
  valid: boolean;
};

export type QuoteContext = {
  settings: Settings;
  /** userId when signed in, or a normalised phone/email, for per-customer coupon limits. */
  customerKey?: string | null;
  deliveryOptionId?: string;
  postalCode?: string;
  now?: Date;
};

const boxKey = (variantId: string, selections: { productId: string; quantity: number }[]) =>
  `${variantId}:${createHash("sha1")
    .update([...selections].sort((a, b) => a.productId.localeCompare(b.productId)).map((s) => `${s.productId}x${s.quantity}`).join(","))
    .digest("hex")
    .slice(0, 10)}`;

/**
 * Price a cart entirely from the database. Nothing the browser sends about prices, names or totals is
 * trusted: the client supplies only variant ids, quantities, box selections and a coupon code.
 */
export async function quoteCart(client: DbClient, cart: CartInput, ctx: QuoteContext): Promise<Quote> {
  const now = ctx.now ?? new Date();
  const issues: string[] = [];

  // Merge identical lines so stock is checked on the real total.
  const merged = new Map<string, CartItemInput>();
  for (const item of cart.items) {
    const key = item.type === "box" ? boxKey(item.variantId, item.selections) : item.variantId;
    const existing = merged.get(key);
    if (existing) {
      const cap = item.type === "box" ? MAX_BOX_QTY : MAX_LINE_QTY;
      existing.quantity = Math.min(cap, existing.quantity + item.quantity);
    } else {
      merged.set(key, structuredClone(item));
    }
  }

  const variantIds = [...new Set([...merged.values()].map((i) => i.variantId))];
  const variants = await client.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const selectionProductIds = [
    ...new Set([...merged.values()].flatMap((i) => (i.type === "box" ? i.selections.map((s) => s.productId) : []))),
  ];
  const flavourProducts = selectionProductIds.length
    ? await client.product.findMany({ where: { id: { in: selectionProductIds } } })
    : [];
  const flavourById = new Map(flavourProducts.map((p) => [p.id, p]));

  const lines: QuoteLine[] = [];
  const wanted = new Map<string, number>(); // variantId -> total units across lines

  for (const [key, item] of merged) {
    const v = byId.get(item.variantId);
    if (!v || v.archivedAt || v.product.status !== "ACTIVE") {
      issues.push("An item in your cart is no longer available and was removed.");
      continue;
    }
    const name = `${v.product.name} (${v.label})`;
    if (!v.isAvailable) {
      issues.push(`${name} is currently unavailable.`);
      continue;
    }
    if (v.priceInPaise == null) {
      issues.push(`${name} does not have a confirmed price yet. Please enquire on WhatsApp.`);
      continue;
    }

    let selections: QuoteLine["selections"];
    if (item.type === "box") {
      if (v.product.kind !== "CUSTOM_BOX" || !v.pieces) {
        issues.push(`${name} is not a customisable box.`);
        continue;
      }
      const picks = new Map<string, number>();
      item.selections.forEach((s) => picks.set(s.productId, (picks.get(s.productId) ?? 0) + s.quantity));
      const total = [...picks.values()].reduce((a, b) => a + b, 0);
      if (total !== v.pieces) {
        issues.push(`${name}: please choose exactly ${v.pieces} brownies (you chose ${total}).`);
        continue;
      }
      let ok = true;
      selections = [];
      for (const [productId, qty] of picks) {
        const p = flavourById.get(productId);
        if (!p || p.status !== "ACTIVE" || !p.boxSelectable || p.kind !== "STANDARD") {
          issues.push(`${name}: one of the chosen flavours is not available for boxes.`);
          ok = false;
          break;
        }
        selections.push({ productId, name: p.name, quantity: qty });
      }
      if (!ok) continue;
    } else if (v.product.kind !== "STANDARD") {
      issues.push(`${name} must be ordered through the box builder.`);
      continue;
    }

    wanted.set(v.id, (wanted.get(v.id) ?? 0) + item.quantity);
    lines.push({
      key,
      type: item.type,
      variantId: v.id,
      productId: v.productId,
      categoryId: v.product.categoryId,
      productName: v.product.name,
      productSlug: v.product.slug,
      variantLabel: v.label,
      sku: v.sku,
      imageUrl: v.product.images[0]?.url ?? null,
      tracked: v.trackInventory,
      unitPricePaise: v.priceInPaise,
      quantity: item.quantity,
      lineTotalPaise: v.priceInPaise * item.quantity,
      selections,
    });
  }

  // Stock validation on the aggregate demand per variant.
  for (const [variantId, qty] of wanted) {
    const v = byId.get(variantId)!;
    if (v.trackInventory && v.stockQuantity < qty) {
      issues.push(
        v.stockQuantity <= 0
          ? `${v.product.name} (${v.label}) is out of stock.`
          : `Only ${v.stockQuantity} of ${v.product.name} (${v.label}) left in stock.`,
      );
    }
  }

  // Delivery.
  let delivery: Quote["delivery"] = null;
  let deliveryError: string | null = null;
  const optionId = ctx.deliveryOptionId ?? ctx.settings.deliveryOptions.find((o) => o.enabled)?.id;
  if (optionId) {
    const d = deliveryFor(ctx.settings, optionId, ctx.postalCode ?? "");
    if (d.ok) delivery = { optionId, label: d.label, feePaise: d.feePaise };
    else if (ctx.postalCode) deliveryError = d.reason;
    else {
      // No postal code yet (cart page): show the base option fee for estimation.
      const opt = ctx.settings.deliveryOptions.find((o) => o.id === optionId && o.enabled);
      if (opt) delivery = { optionId, label: opt.label, feePaise: opt.feePaise };
    }
  } else {
    deliveryError = "No delivery option is configured.";
  }

  // Coupon.
  const pricingLines: PricingLine[] = lines.map((l) => ({
    key: l.key,
    productId: l.productId,
    categoryId: l.categoryId,
    unitPricePaise: l.unitPricePaise,
    quantity: l.quantity,
  }));
  const subtotal = pricingLines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);

  let coupon: CouponState | null = null;
  let couponError: string | null = null;
  const code = cart.couponCode ? normalizeCouponCode(cart.couponCode) : "";
  if (code) {
    const row = await client.coupon.findUnique({ where: { code } });
    if (!row) {
      couponError = "That coupon code is not valid.";
    } else {
      const customerRedemptions =
        row.perCustomerLimit != null && ctx.customerKey
          ? await client.couponRedemption.count({ where: { couponId: row.id, customerKey: ctx.customerKey } })
          : 0;
      const state: CouponState = {
        id: row.id,
        code: row.code,
        type: row.type,
        value: row.value,
        maxDiscountPaise: row.maxDiscountPaise,
        minOrderPaise: row.minOrderPaise,
        productIds: row.productIds,
        categoryIds: row.categoryIds,
        isActive: row.isActive,
        startsAt: row.startsAt,
        expiresAt: row.expiresAt,
        usageLimit: row.usageLimit,
        usedCount: row.usedCount,
        perCustomerLimit: row.perCustomerLimit,
      };
      const check = checkCoupon(state, { now, lines: pricingLines, subtotalPaise: subtotal, customerRedemptions });
      if (check.ok) coupon = state;
      else couponError = check.reason;
    }
  }

  const pricing = priceOrder(pricingLines, coupon, {
    deliveryFeePaise: delivery?.feePaise ?? 0,
    freeDeliveryThresholdPaise: ctx.settings.freeDeliveryThresholdPaise,
    tax: ctx.settings.tax,
  });

  return {
    lines,
    issues: [...new Set(issues)],
    pricing,
    coupon: coupon ? { id: coupon.id, code: coupon.code, discountPaise: pricing.discountPaise } : null,
    couponError,
    delivery,
    deliveryError,
    valid: lines.length > 0 && issues.length === 0 && !deliveryError,
  };
}
