"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actorFromUser, audit } from "@/lib/audit";
import { authorize } from "@/lib/auth/guards";
import { clientIp } from "@/lib/auth/session";
import { normalizeCouponCode } from "@/lib/coupons";
import { db } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";
import { saveSettings, settingsSchema } from "@/lib/settings";
import type { Permission } from "@/lib/auth/permissions";
import type { FormState } from "../newsletter";

async function guarded(permission: Permission, fn: (a: { actor: ReturnType<typeof actorFromUser>; ip: string; userId: string }) => Promise<string>): Promise<FormState> {
  const auth = await authorize(permission);
  if (!auth.ok) return { ok: false, message: auth.error };
  try {
    return { ok: true, message: await fn({ actor: actorFromUser(auth.user), ip: await clientIp(), userId: auth.user.id }) };
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") return { ok: false, message: "That value is already in use." };
    console.error("[admin/misc] unexpected error", e);
    return { ok: false, message: "Something went wrong. Nothing was saved." };
  }
}

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const on = (v: FormDataEntryValue | null) => v === "on" || v === "true";
const first = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";

// ───────────────────────────── Coupons ─────────────────────────────

const rupeeField = z.string().trim().transform((v, ctx) => {
  if (v === "") return null;
  const p = rupeesToPaise(v);
  if (p === null) { ctx.addIssue({ code: "custom", message: "Enter amounts as plain rupees, e.g. 100 or 99.50" }); return z.NEVER; }
  return p;
});

const istDate = z.string().trim().transform((v, ctx) => {
  if (!v) return null;
  const d = new Date(`${v}:00+05:30`);
  if (Number.isNaN(d.getTime())) { ctx.addIssue({ code: "custom", message: "Enter a valid date and time" }); return z.NEVER; }
  return d;
});

const couponSchema = z.object({
  code: z.string().trim().min(3, "Code needs at least 3 characters").max(30).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, dashes and underscores only").transform(normalizeCouponCode),
  description: z.string().trim().max(200).default(""),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.string().trim().min(1, "Enter the discount value"),
  maxDiscount: rupeeField,
  minOrder: rupeeField,
  startsAt: istDate,
  expiresAt: istDate,
  usageLimit: z.string().trim().transform((v) => (v ? Number(v) : null)).pipe(z.number().int().min(1).nullable()),
  perCustomerLimit: z.string().trim().transform((v) => (v ? Number(v) : null)).pipe(z.number().int().min(1).nullable()),
  productIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
});

export async function saveCouponAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = couponSchema.safeParse({
    code: text(fd.get("code")), description: text(fd.get("description")), type: text(fd.get("type")), value: text(fd.get("value")),
    maxDiscount: text(fd.get("maxDiscount")), minOrder: text(fd.get("minOrder")), startsAt: text(fd.get("startsAt")), expiresAt: text(fd.get("expiresAt")),
    usageLimit: text(fd.get("usageLimit")), perCustomerLimit: text(fd.get("perCustomerLimit")),
    productIds: fd.getAll("productIds").map(String), categoryIds: fd.getAll("categoryIds").map(String),
  });
  if (!parsed.success) return { ok: false, message: first(parsed.error) };
  const c = parsed.data;

  let value: number;
  if (c.type === "PERCENT") {
    value = Number(c.value);
    if (!Number.isInteger(value) || value < 1 || value > 100) return { ok: false, message: "A percentage discount must be a whole number from 1 to 100." };
  } else {
    const p = rupeesToPaise(c.value);
    if (p === null || p <= 0) return { ok: false, message: "Enter the fixed discount in rupees, e.g. 100." };
    value = p;
  }
  if (c.startsAt && c.expiresAt && c.expiresAt <= c.startsAt) return { ok: false, message: "The expiry must be after the start." };

  const id = text(fd.get("couponId"));
  const isActive = on(fd.get("isActive"));
  return guarded("coupons:write", async ({ actor, ip }) => {
    const data = {
      code: c.code, description: c.description || null, type: c.type, value, maxDiscountPaise: c.type === "PERCENT" ? c.maxDiscount : null,
      minOrderPaise: c.minOrder ?? 0, startsAt: c.startsAt, expiresAt: c.expiresAt, usageLimit: c.usageLimit, perCustomerLimit: c.perCustomerLimit,
      isActive, productIds: c.productIds, categoryIds: c.categoryIds,
    };
    const saved = id ? await db.coupon.update({ where: { id }, data }) : await db.coupon.create({ data });
    await audit(actor, id ? "coupon.update" : "coupon.create", "Coupon", saved.id, { code: saved.code, isActive }, db, ip);
    revalidatePath("/admin/coupons");
    return id ? "Coupon saved." : "Coupon created.";
  });
}

export async function toggleCouponAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = text(fd.get("couponId"));
  return guarded("coupons:write", async ({ actor, ip }) => {
    const cur = await db.coupon.findUniqueOrThrow({ where: { id } });
    await db.coupon.update({ where: { id }, data: { isActive: !cur.isActive } });
    await audit(actor, "coupon.toggle", "Coupon", id, { code: cur.code, isActive: !cur.isActive }, db, ip);
    revalidatePath("/admin/coupons");
    return cur.isActive ? "Coupon deactivated." : "Coupon activated.";
  });
}

// ───────────────────────────── Reviews ─────────────────────────────

export async function moderateReviewAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ reviewId: z.string().min(1), decision: z.enum(["APPROVED", "REJECTED", "DELETE"]) }).safeParse({ reviewId: text(fd.get("reviewId")), decision: text(fd.get("decision")) });
  if (!p.success) return { ok: false, message: "Invalid request." };
  return guarded("reviews:moderate", async ({ actor, ip }) => {
    if (p.data.decision === "DELETE") await db.review.delete({ where: { id: p.data.reviewId } });
    else await db.review.update({ where: { id: p.data.reviewId }, data: { status: p.data.decision, moderatedAt: new Date() } });
    await audit(actor, `review.${p.data.decision.toLowerCase()}`, "Review", p.data.reviewId, undefined, db, ip);
    revalidatePath("/admin/reviews");
    revalidatePath("/");
    return p.data.decision === "APPROVED" ? "Review approved and now visible." : p.data.decision === "REJECTED" ? "Review rejected." : "Review deleted.";
  });
}

// ───────────────────────────── Settings ─────────────────────────────

/** The settings form posts a structured object (amounts already converted to paise); the schema is the authority. */
export async function saveSettingsAction(raw: unknown): Promise<FormState> {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, message: `${i?.path.join(" › ") || "Settings"}: ${i?.message ?? "invalid value"}` };
  }
  return guarded("settings:write", async ({ actor, userId, ip }) => {
    const before = await db.siteSetting.findUnique({ where: { key: "site" } });
    await saveSettings(parsed.data, userId);
    await audit(actor, "settings.update", "SiteSetting", "site", { orderingEnabled: parsed.data.orderingEnabled, codEnabled: parsed.data.codEnabled, firstSave: !before }, db, ip);
    revalidatePath("/", "layout");
    return "Settings saved.";
  });
}

// ───────────────────────────── Customers ─────────────────────────────

export async function saveCustomerNoteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = text(fd.get("userId"));
  const note = text(fd.get("note")).slice(0, 2000);
  return guarded("customers:notes", async ({ actor, ip }) => {
    await db.user.update({ where: { id }, data: { internalNote: note || null } });
    await audit(actor, "customer.note", "User", id, undefined, db, ip);
    revalidatePath(`/admin/customers/${id}`);
    return "Note saved. Only admins can see it.";
  });
}
