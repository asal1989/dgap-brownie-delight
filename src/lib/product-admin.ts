import { z } from "zod";
import type { InventoryReason } from "@/generated/prisma/enums";
import { db, type DbClient } from "./db";
import { audit, type Actor } from "./audit";
import { slugify } from "./catalog";

/** Recompute the denormalised lowest price used for price sorting/filtering. Call after any variant change. */
export async function refreshMinPrice(client: DbClient, productId: string) {
  const agg = await client.productVariant.aggregate({
    where: { productId, archivedAt: null, isAvailable: true, priceInPaise: { not: null } },
    _min: { priceInPaise: true },
  });
  await client.product.update({ where: { id: productId }, data: { minPricePaise: agg._min.priceInPaise } });
}

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().optional();

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: z.string().trim().max(80).optional().default(""),
  shortDescription: z.string().trim().min(2, "Short description is required").max(240),
  description: z.string().trim().min(2, "Description is required").max(5000),
  categoryId: z.string().trim().max(40).optional().default(""),
  kind: z.enum(["STANDARD", "CUSTOM_BOX"]).default("STANDARD"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  ingredients: optionalText(2000),
  allergens: optionalText(1000),
  dietaryLabels: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  boxSelectable: z.boolean().default(false),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});
export type ProductInput = z.infer<typeof productInputSchema>;

async function uniqueSlug(client: DbClient, base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "product";
  let slug = root;
  for (let n = 2; ; n++) {
    const clash = await client.product.findUnique({ where: { slug } });
    if (!clash || clash.id === ignoreId) return slug;
    slug = `${root}-${n}`;
  }
}

export async function createProduct(input: ProductInput, actor: Actor, ip?: string) {
  return db.$transaction(async (tx) => {
    const slug = await uniqueSlug(tx, input.slug || input.name);
    const p = await tx.product.create({
      data: { ...input, slug, categoryId: input.categoryId || null, ingredients: input.ingredients ?? null, allergens: input.allergens ?? null, seoTitle: input.seoTitle ?? null, seoDescription: input.seoDescription ?? null },
    });
    await audit(actor, "product.create", "Product", p.id, { name: p.name, slug }, tx, ip);
    return p;
  });
}

export async function updateProduct(id: string, input: ProductInput, actor: Actor, ip?: string) {
  return db.$transaction(async (tx) => {
    const slug = await uniqueSlug(tx, input.slug || input.name, id);
    const p = await tx.product.update({
      where: { id },
      data: {
        ...input,
        slug,
        categoryId: input.categoryId || null,
        ingredients: input.ingredients ?? null,
        allergens: input.allergens ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        archivedAt: input.status === "ARCHIVED" ? new Date() : null,
      },
    });
    await audit(actor, "product.update", "Product", p.id, { name: p.name, status: p.status }, tx, ip);
    return p;
  });
}

/** Products referenced by historical orders are archived, never deleted. Unreferenced drafts may be removed. */
export async function removeOrArchiveProduct(id: string, actor: Actor, ip?: string): Promise<"deleted" | "archived"> {
  return db.$transaction(async (tx) => {
    const used = await tx.orderItem.count({ where: { productId: id } });
    if (used > 0) {
      await tx.product.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
      await audit(actor, "product.archive", "Product", id, { reason: "has order history" }, tx, ip);
      return "archived";
    }
    await tx.product.delete({ where: { id } });
    await audit(actor, "product.delete", "Product", id, undefined, tx, ip);
    return "deleted";
  });
}

export const variantInputSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(60),
  sku: z.string().trim().min(2, "SKU is required").max(40).regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, dots, dashes only"),
  weightGrams: z.number().int().min(1).max(100_000).nullable().default(null),
  pieces: z.number().int().min(1).max(200).nullable().default(null),
  priceInPaise: z.number().int().min(0).max(100_000_000).nullable().default(null),
  compareAtPriceInPaise: z.number().int().min(0).max(100_000_000).nullable().default(null),
  stockQuantity: z.number().int().min(0).max(1_000_000).default(0),
  trackInventory: z.boolean().default(true),
  lowStockThreshold: z.number().int().min(0).max(10_000).default(5),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

function checkCompare(v: VariantInput) {
  if (v.compareAtPriceInPaise != null && v.priceInPaise != null && v.compareAtPriceInPaise <= v.priceInPaise) {
    throw new Error("Compare-at price must be higher than the selling price.");
  }
}

export async function createVariant(productId: string, input: VariantInput, actor: Actor, ip?: string) {
  checkCompare(input);
  return db.$transaction(async (tx) => {
    const v = await tx.productVariant.create({ data: { ...input, productId } });
    if (v.stockQuantity > 0) {
      await tx.inventoryMovement.create({ data: { variantId: v.id, delta: v.stockQuantity, quantityAfter: v.stockQuantity, reason: "INITIAL", actorId: actor.id, note: "Variant created" } });
    }
    await refreshMinPrice(tx, productId);
    await audit(actor, "variant.create", "ProductVariant", v.id, { sku: v.sku, priceInPaise: v.priceInPaise }, tx, ip);
    return v;
  });
}

/** Update everything except stock quantity, which only changes through recorded inventory movements. */
export async function updateVariant(id: string, input: Omit<VariantInput, "stockQuantity">, actor: Actor, ip?: string) {
  checkCompare({ ...input, stockQuantity: 0 });
  return db.$transaction(async (tx) => {
    const before = await tx.productVariant.findUniqueOrThrow({ where: { id } });
    const v = await tx.productVariant.update({ where: { id }, data: input });
    await refreshMinPrice(tx, v.productId);
    await audit(actor, "variant.update", "ProductVariant", v.id, { sku: v.sku, priceFrom: before.priceInPaise, priceTo: v.priceInPaise, availableTo: v.isAvailable }, tx, ip);
    return v;
  });
}

export async function archiveVariant(id: string, actor: Actor, ip?: string) {
  return db.$transaction(async (tx) => {
    const v = await tx.productVariant.update({ where: { id }, data: { archivedAt: new Date(), isAvailable: false } });
    await refreshMinPrice(tx, v.productId);
    await audit(actor, "variant.archive", "ProductVariant", v.id, { sku: v.sku }, tx, ip);
  });
}

export class StockError extends Error {}

/**
 * Change stock by a signed amount or to an absolute count. Always recorded as an inventory movement with a
 * reason, actor and resulting quantity, and can never take stock below zero.
 */
export async function adjustStock(args: {
  variantId: string;
  mode: "delta" | "set";
  amount: number;
  reason: InventoryReason;
  note?: string | null;
  actor: Actor;
  ip?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.$queryRaw<{ stockQuantity: number }[]>`SELECT "stockQuantity" FROM "ProductVariant" WHERE "id" = ${args.variantId} FOR UPDATE`;
    if (!current.length) throw new StockError("Variant not found.");
    const before = Number(current[0].stockQuantity);
    const delta = args.mode === "set" ? args.amount - before : args.amount;
    const after = before + delta;
    if (!Number.isInteger(after) || after < 0) throw new StockError("Stock cannot go below zero.");
    if (delta === 0) return { before, after };
    await tx.productVariant.update({ where: { id: args.variantId }, data: { stockQuantity: after } });
    await tx.inventoryMovement.create({
      data: { variantId: args.variantId, delta, quantityAfter: after, reason: args.reason, note: args.note ?? null, actorId: args.actor.id },
    });
    await audit(args.actor, "inventory.adjust", "ProductVariant", args.variantId, { before, after, reason: args.reason, note: args.note ?? null }, tx, args.ip);
    return { before, after };
  });
}
