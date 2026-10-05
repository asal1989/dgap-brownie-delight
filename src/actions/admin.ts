"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { SETTING_DEFAULTS, type SettingKey } from "@/lib/config";
import { ORDER_STATUSES } from "@/lib/orders/status";
import { sanitizeText, slugify } from "@/lib/utils";
import type { ActionResult } from "@/types";

type State = ActionResult | null;

const flag = (fd: FormData, k: string) => fd.get(k) === "on";
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const intOr = (v: string, fallback: number | null) => {
  if (v === "") return fallback;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

function fail(error: string): ActionResult {
  return { ok: false, error };
}
function isUnique(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}
function refresh(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
  revalidatePath("/", "layout");
}

/* ------------------------------ Products ------------------------------ */

const productSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  slug: z.string().max(100),
  categoryId: z.string().min(1, "Choose a category"),
  price: z.number().int("Price must be a whole number").min(1, "Price must be at least ₹1"),
  compareAtPrice: z.number().int().min(1).nullable(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  sku: z.string().max(60).nullable(),
  shortDescription: z.string().max(200).nullable(),
  description: z.string().min(2, "Description is required").max(5000),
  ingredients: z.string().max(2000).nullable(),
  allergens: z.string().max(2000).nullable(),
  storage: z.string().max(2000).nullable(),
  deliveryInfo: z.string().max(2000).nullable(),
});

export async function saveProduct(_prev: State, fd: FormData): Promise<State> {
  await requireAdmin();
  const id = str(fd, "id");
  const images = str(fd, "images")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^(\/images\/|\/uploads\/|https:\/\/)/.test(l))
    .slice(0, 8);

  const parsed = productSchema.safeParse({
    name: str(fd, "name"),
    slug: str(fd, "slug"),
    categoryId: str(fd, "categoryId"),
    price: intOr(str(fd, "price"), NaN),
    compareAtPrice: intOr(str(fd, "compareAtPrice"), null),
    stock: intOr(str(fd, "stock"), 0),
    sku: optStr(fd, "sku"),
    shortDescription: optStr(fd, "shortDescription"),
    description: str(fd, "description"),
    ingredients: optStr(fd, "ingredients"),
    allergens: optStr(fd, "allergens"),
    storage: optStr(fd, "storage"),
    deliveryInfo: optStr(fd, "deliveryInfo"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const d = parsed.data;
  const data = {
    ...d,
    name: sanitizeText(d.name),
    slug: slugify(d.slug || d.name),
    images,
    isActive: flag(fd, "isActive"),
    isFeatured: flag(fd, "isFeatured"),
    isBestSeller: flag(fd, "isBestSeller"),
    isGiftBox: flag(fd, "isGiftBox"),
    isBoxEligible: flag(fd, "isBoxEligible"),
    isSample: flag(fd, "isSample"),
  };
  if (!data.slug) return fail("Could not create a URL slug from that name.");

  try {
    if (id) await prisma.product.update({ where: { id }, data });
    else await prisma.product.create({ data });
  } catch (e) {
    if (isUnique(e)) return fail("Another product already uses that slug or SKU.");
    console.error(e);
    return fail("Could not save the product.");
  }
  refresh("/admin/products", "/shop");
  redirect("/admin/products?saved=1");
}

export async function toggleProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const p = await prisma.product.findUnique({ where: { id }, select: { isActive: true } });
  if (p) await prisma.product.update({ where: { id }, data: { isActive: !p.isActive } });
  refresh("/admin/products", "/shop");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.product.delete({ where: { id: str(formData, "id") } }).catch(() => undefined);
  refresh("/admin/products", "/shop");
}

/* ------------------------------ Categories ------------------------------ */

const categorySchema = z.object({
  name: z.string().min(2, "Name is required").max(60),
  slug: z.string().max(60),
  description: z.string().max(300).nullable(),
  image: z.string().max(500).nullable(),
  sortOrder: z.number().int().min(0).max(999),
});

export async function saveCategory(_prev: State, fd: FormData): Promise<State> {
  await requireAdmin();
  const id = str(fd, "id");
  const parsed = categorySchema.safeParse({
    name: str(fd, "name"),
    slug: str(fd, "slug"),
    description: optStr(fd, "description"),
    image: optStr(fd, "image"),
    sortOrder: intOr(str(fd, "sortOrder"), 0),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  if (parsed.data.image && !/^(\/images\/|\/uploads\/|https:\/\/)/.test(parsed.data.image)) return fail("Image must be a /images/… path or an https URL.");
  const data = { ...parsed.data, name: sanitizeText(parsed.data.name), slug: slugify(parsed.data.slug || parsed.data.name), isActive: flag(fd, "isActive") };
  try {
    if (id) await prisma.category.update({ where: { id }, data });
    else await prisma.category.create({ data });
  } catch (e) {
    if (isUnique(e)) return fail("Another category already uses that slug.");
    return fail("Could not save the category.");
  }
  refresh("/admin/categories", "/shop");
  redirect("/admin/categories?saved=1");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if ((await prisma.product.count({ where: { categoryId: id } })) > 0) return; // protected: still has products
  await prisma.category.delete({ where: { id } }).catch(() => undefined);
  refresh("/admin/categories", "/shop");
}

/* ------------------------------ Orders ------------------------------ */

export async function updateOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return;
  const next = status as (typeof ORDER_STATUSES)[number];

  await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!o || o.status === next || o.status === "CANCELLED") return; // cancelled orders are final
    if (next === "CANCELLED") {
      for (const i of o.items) {
        if (i.productId) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
      }
      if (o.couponId) await tx.coupon.updateMany({ where: { id: o.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    }
    await tx.order.update({ where: { id }, data: { status: next } });
  });
  refresh("/admin/orders", `/admin/orders/${id}`, "/admin");
}

export async function markCodPaid(formData: FormData): Promise<void> {
  await requireAdmin();
  const orderId = str(formData, "id");
  await prisma.payment.updateMany({ where: { orderId, method: "COD", status: "PENDING" }, data: { status: "PAID" } });
  refresh(`/admin/orders/${orderId}`, "/admin");
}

/* ------------------------------ Reviews / FAQ / messages ------------------------------ */

export async function setReviewApproval(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.review.update({ where: { id: str(formData, "id") }, data: { isApproved: str(formData, "approve") === "1" } }).catch(() => undefined);
  refresh("/admin/reviews");
}

export async function deleteReview(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.review.delete({ where: { id: str(formData, "id") } }).catch(() => undefined);
  refresh("/admin/reviews");
}

export async function saveFaq(_prev: State, fd: FormData): Promise<State> {
  await requireAdmin();
  const id = str(fd, "id");
  const parsed = z
    .object({ question: z.string().min(3).max(200), answer: z.string().min(2).max(3000), sortOrder: z.number().int().min(0).max(999) })
    .safeParse({ question: str(fd, "question"), answer: str(fd, "answer"), sortOrder: intOr(str(fd, "sortOrder"), 0) });
  if (!parsed.success) return fail("Please enter a question and an answer.");
  const data = { ...parsed.data, isActive: flag(fd, "isActive") };
  if (id) await prisma.faq.update({ where: { id }, data });
  else await prisma.faq.create({ data });
  refresh("/admin/faqs", "/faq");
  redirect("/admin/faqs?saved=1");
}

export async function deleteFaq(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.faq.delete({ where: { id: str(formData, "id") } }).catch(() => undefined);
  refresh("/admin/faqs", "/faq");
}

export async function markMessageRead(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.contactMessage.update({ where: { id: str(formData, "id") }, data: { isRead: true } }).catch(() => undefined);
  refresh("/admin/messages");
}

/* ------------------------------ Coupons ------------------------------ */

export async function saveCoupon(_prev: State, fd: FormData): Promise<State> {
  await requireAdmin();
  const id = str(fd, "id");
  const type = str(fd, "discountType");
  const parsed = z
    .object({
      code: z.string().min(3, "Code must be at least 3 characters").max(30).regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, - or _ only"),
      discountType: z.enum(["PERCENTAGE", "FIXED"]),
      discountValue: z.number().int().min(1, "Discount value is required"),
      minimumOrder: z.number().int().min(0),
      maximumDiscount: z.number().int().min(1).nullable(),
      usageLimit: z.number().int().min(1).nullable(),
    })
    .safeParse({
      code: str(fd, "code").toUpperCase(),
      discountType: type,
      discountValue: intOr(str(fd, "discountValue"), NaN),
      minimumOrder: intOr(str(fd, "minimumOrder"), 0),
      maximumDiscount: intOr(str(fd, "maximumDiscount"), null),
      usageLimit: intOr(str(fd, "usageLimit"), null),
    });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  if (parsed.data.discountType === "PERCENTAGE" && parsed.data.discountValue > 100) return fail("A percentage discount cannot exceed 100.");
  const expires = str(fd, "expiresAt");
  const data = { ...parsed.data, expiresAt: expires ? new Date(`${expires}T23:59:59`) : null, isActive: flag(fd, "isActive") };
  try {
    if (id) await prisma.coupon.update({ where: { id }, data });
    else await prisma.coupon.create({ data });
  } catch (e) {
    if (isUnique(e)) return fail("That coupon code already exists.");
    return fail("Could not save the coupon.");
  }
  refresh("/admin/coupons");
  redirect("/admin/coupons?saved=1");
}

export async function deleteCoupon(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.coupon.delete({ where: { id: str(formData, "id") } }).catch(() => undefined);
  refresh("/admin/coupons");
}

/* ------------------------------ Settings ------------------------------ */

const BOOLEAN_KEYS: SettingKey[] = ["sameDayDelivery", "codEnabled"];
const URL_KEYS: SettingKey[] = ["instagram", "facebook"];
const INT_KEYS: SettingKey[] = ["deliveryFee", "freeDeliveryThreshold", "minimumOrder"];

export async function saveSettings(_prev: State, fd: FormData): Promise<State> {
  await requireAdmin();
  const entries: [SettingKey, string][] = [];
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    let value = BOOLEAN_KEYS.includes(key) ? (flag(fd, key) ? "true" : "false") : str(fd, key);
    if (URL_KEYS.includes(key) && value && !/^https:\/\//.test(value)) return fail(`${key} must start with https://`);
    if (INT_KEYS.includes(key)) {
      const n = intOr(value, 0);
      if (n === null || Number.isNaN(n) || n < 0) return fail(`${key} must be a whole number, 0 or more.`);
      value = String(n);
    }
    if (key === "whatsapp") value = value.replace(/\D/g, "");
    if (key === "mapEmbedUrl" && value && !value.startsWith("https://www.google.com/maps/embed")) return fail("Map URL must be a Google Maps embed link.");
    if (["logo", "heroImage", "signatureImage"].includes(key) && value && !/^(\/images\/|\/uploads\/|https:\/\/)/.test(value)) return fail(`${key} must be a /images/… path or an https URL.`);
    entries.push([key, value]);
  }
  await prisma.$transaction(entries.map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })));
  refresh("/admin/settings");
  return { ok: true, message: "Settings saved." };
}
