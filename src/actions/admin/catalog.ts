"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actorFromUser, audit } from "@/lib/audit";
import { authorize } from "@/lib/auth/guards";
import { clientIp } from "@/lib/auth/session";
import { slugify } from "@/lib/catalog";
import { db } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";
import {
  adjustStock, archiveVariant, createProduct, createVariant, productInputSchema, removeOrArchiveProduct,
  StockError, updateProduct, updateVariant, variantInputSchema,
} from "@/lib/product-admin";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { storeProductImage, UploadError } from "@/lib/storage";
import type { Permission } from "@/lib/auth/permissions";
import type { FormState } from "../newsletter";

async function guarded(permission: Permission, fn: (a: { actor: ReturnType<typeof actorFromUser>; ip: string; userId: string }) => Promise<string>): Promise<FormState> {
  const auth = await authorize(permission);
  if (!auth.ok) return { ok: false, message: auth.error };
  try {
    return { ok: true, message: await fn({ actor: actorFromUser(auth.user), ip: await clientIp(), userId: auth.user.id }) };
  } catch (e) {
    if (e instanceof UploadError || e instanceof StockError) return { ok: false, message: e.message };
    if (e instanceof Error && /Compare-at/.test(e.message)) return { ok: false, message: e.message };
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") return { ok: false, message: "That value is already in use (names, slugs and SKUs must be unique)." };
    console.error("[admin/catalog] unexpected error", e);
    return { ok: false, message: "Something went wrong. Nothing was saved." };
  }
}

const on = (v: FormDataEntryValue | null) => v === "on" || v === "true";
const num = (v: FormDataEntryValue | null, fallback = 0) => (v === null || v === "" ? fallback : Number(v));
const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

function productFromForm(fd: FormData) {
  return productInputSchema.safeParse({
    name: text(fd.get("name")),
    slug: text(fd.get("slug")),
    shortDescription: text(fd.get("shortDescription")),
    description: text(fd.get("description")),
    categoryId: text(fd.get("categoryId")),
    kind: text(fd.get("kind")) || "STANDARD",
    status: text(fd.get("status")) || "DRAFT",
    ingredients: text(fd.get("ingredients")),
    allergens: text(fd.get("allergens")),
    dietaryLabels: text(fd.get("dietaryLabels")).split(",").map((s) => s.trim()).filter(Boolean),
    isFeatured: on(fd.get("isFeatured")),
    isBestseller: on(fd.get("isBestseller")),
    boxSelectable: on(fd.get("boxSelectable")),
    seoTitle: text(fd.get("seoTitle")),
    seoDescription: text(fd.get("seoDescription")),
    sortOrder: num(fd.get("sortOrder")),
  });
}

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";

function refresh(productId?: string) {
  revalidatePath("/admin/products");
  if (productId) revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function createProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const auth = await authorize("products:write");
  if (!auth.ok) return { ok: false, message: auth.error };
  const parsed = productFromForm(fd);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  let id: string;
  try {
    const p = await createProduct(parsed.data, actorFromUser(auth.user), await clientIp());
    id = p.id;
  } catch (e) {
    console.error("[admin/catalog] create product failed", e);
    return { ok: false, message: "The product could not be created." };
  }
  refresh();
  redirect(`/admin/products/${id}`);
}

export async function updateProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const productId = text(fd.get("productId"));
  const parsed = productFromForm(fd);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  return guarded("products:write", async ({ actor, ip }) => {
    await updateProduct(productId, parsed.data, actor, ip);
    refresh(productId);
    return "Product saved.";
  });
}

export async function removeProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const productId = text(fd.get("productId"));
  if (!on(fd.get("confirm"))) return { ok: false, message: "Tick the box to confirm." };
  const auth = await authorize("products:write");
  if (!auth.ok) return { ok: false, message: auth.error };
  const result = await removeOrArchiveProduct(productId, actorFromUser(auth.user), await clientIp());
  refresh();
  redirect(`/admin/products?removed=${result}`);
}

function variantFromForm(fd: FormData): { data: z.infer<typeof variantInputSchema>; error?: undefined } | { error: string; data?: undefined } {
  const money = (k: string) => {
    const raw = text(fd.get(k)).trim();
    if (!raw) return { value: null as number | null, ok: true };
    const p = rupeesToPaise(raw);
    return { value: p, ok: p !== null };
  };
  const price = money("price");
  const compare = money("compareAt");
  if (!price.ok || !compare.ok) return { error: "Enter prices as plain rupee amounts, e.g. 250 or 249.50." };
  const parsed = variantInputSchema.safeParse({
    label: text(fd.get("label")),
    sku: text(fd.get("sku")),
    weightGrams: fd.get("weightGrams") ? num(fd.get("weightGrams")) : null,
    pieces: fd.get("pieces") ? num(fd.get("pieces")) : null,
    priceInPaise: price.value,
    compareAtPriceInPaise: compare.value,
    stockQuantity: num(fd.get("stockQuantity")),
    trackInventory: on(fd.get("trackInventory")),
    lowStockThreshold: num(fd.get("lowStockThreshold"), 5),
    isAvailable: on(fd.get("isAvailable")),
    sortOrder: num(fd.get("sortOrder")),
  });
  return parsed.success ? { data: parsed.data } : { error: firstIssue(parsed.error) };
}

export async function createVariantAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const productId = text(fd.get("productId"));
  const v = variantFromForm(fd);
  if (v.error !== undefined) return { ok: false, message: v.error };
  return guarded("products:write", async ({ actor, ip }) => {
    await createVariant(productId, v.data, actor, ip);
    refresh(productId);
    return "Variant added.";
  });
}

export async function updateVariantAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const variantId = text(fd.get("variantId"));
  const productId = text(fd.get("productId"));
  const v = variantFromForm(fd);
  if (v.error !== undefined) return { ok: false, message: v.error };
  const { stockQuantity: _ignored, ...rest } = v.data;
  void _ignored;
  return guarded("products:write", async ({ actor, ip }) => {
    await updateVariant(variantId, rest, actor, ip);
    refresh(productId);
    return "Variant saved.";
  });
}

export async function archiveVariantAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const variantId = text(fd.get("variantId"));
  const productId = text(fd.get("productId"));
  return guarded("products:write", async ({ actor, ip }) => {
    await archiveVariant(variantId, actor, ip);
    refresh(productId);
    return "Variant archived. Historical orders are unchanged.";
  });
}

export async function uploadImageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const productId = text(fd.get("productId"));
  const alt = text(fd.get("alt")).trim();
  const file = fd.get("file");
  if (alt.length < 3) return { ok: false, message: "Please describe the photo (alt text) for accessibility." };
  if (!(file instanceof File)) return { ok: false, message: "Please choose an image file." };
  const auth = await authorize("products:write");
  if (!auth.ok) return { ok: false, message: auth.error };
  const limit = await rateLimit(`upload:${auth.user.id}`, LIMITS.upload);
  if (!limit.ok) return { ok: false, message: "Too many uploads. Please wait a moment." };
  return guarded("products:write", async ({ actor, ip }) => {
    const url = await storeProductImage(file);
    const last = await db.productImage.aggregate({ where: { productId }, _max: { sortOrder: true } });
    const img = await db.productImage.create({ data: { productId, url, alt, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    await audit(actor, "product.image.add", "Product", productId, { imageId: img.id }, db, ip);
    refresh(productId);
    return "Photo uploaded.";
  });
}

export async function deleteImageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const imageId = text(fd.get("imageId"));
  const productId = text(fd.get("productId"));
  return guarded("products:write", async ({ actor, ip }) => {
    await db.productImage.delete({ where: { id: imageId } });
    await audit(actor, "product.image.delete", "Product", productId, { imageId }, db, ip);
    refresh(productId);
    return "Photo removed.";
  });
}

export async function makePrimaryImageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const imageId = text(fd.get("imageId"));
  const productId = text(fd.get("productId"));
  return guarded("products:write", async ({ actor, ip }) => {
    const images = await db.productImage.findMany({ where: { productId }, orderBy: { sortOrder: "asc" } });
    const ordered = [...images.filter((i) => i.id === imageId), ...images.filter((i) => i.id !== imageId)];
    await db.$transaction(ordered.map((img, i) => db.productImage.update({ where: { id: img.id }, data: { sortOrder: i } })));
    await audit(actor, "product.image.primary", "Product", productId, { imageId }, db, ip);
    refresh(productId);
    return "Primary photo updated.";
  });
}

// ───────────────────────────── Categories ─────────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  slug: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(300).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export async function saveCategoryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = categorySchema.safeParse({ name: text(fd.get("name")), slug: text(fd.get("slug")), description: text(fd.get("description")), sortOrder: text(fd.get("sortOrder")) || 0 });
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const id = text(fd.get("categoryId"));
  const isActive = on(fd.get("isActive"));
  return guarded("categories:write", async ({ actor, ip }) => {
    const slug = slugify(parsed.data.slug || parsed.data.name);
    if (!slug) throw new Error("A slug could not be created from that name.");
    const data = { name: parsed.data.name, slug, description: parsed.data.description || null, sortOrder: parsed.data.sortOrder, isActive };
    const c = id ? await db.category.update({ where: { id }, data }) : await db.category.create({ data });
    await audit(actor, id ? "category.update" : "category.create", "Category", c.id, { name: c.name }, db, ip);
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    revalidatePath("/");
    return id ? "Category saved." : "Category created.";
  });
}

export async function deleteCategoryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = text(fd.get("categoryId"));
  return guarded("categories:write", async ({ actor, ip }) => {
    const used = await db.product.count({ where: { categoryId: id } });
    if (used > 0) {
      await db.category.update({ where: { id }, data: { isActive: false } });
      await audit(actor, "category.deactivate", "Category", id, { reason: "has products" }, db, ip);
      revalidatePath("/admin/categories");
      return `This category has ${used} product(s), so it was deactivated instead of deleted.`;
    }
    await db.category.delete({ where: { id } });
    await audit(actor, "category.delete", "Category", id, undefined, db, ip);
    revalidatePath("/admin/categories");
    return "Category deleted.";
  });
}

// ───────────────────────────── Inventory ─────────────────────────────

const stockSchema = z.object({
  variantId: z.string().min(1).max(40),
  mode: z.enum(["add", "remove", "set"]),
  amount: z.coerce.number().int().min(0).max(1_000_000),
  reason: z.enum(["RESTOCK", "ADJUSTMENT", "CORRECTION", "DAMAGE"]),
  note: z.string().trim().max(200).optional().default(""),
});

export async function adjustStockAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = stockSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Enter a whole number for the quantity." };
  const { variantId, mode, amount, reason, note } = parsed.data;
  return guarded("inventory:write", async ({ actor, ip }) => {
    const r = await adjustStock({ variantId, mode: mode === "set" ? "set" : "delta", amount: mode === "remove" ? -amount : amount, reason, note: note || null, actor, ip });
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    return r.before === r.after ? "Stock was already at that level." : `Stock changed from ${r.before} to ${r.after}.`;
  });
}
