"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { actorFromUser } from "@/lib/audit";
import { authorize } from "@/lib/auth/guards";
import { clientIp } from "@/lib/auth/session";
import { processNotifications } from "@/lib/notify";
import { rupeesToPaise } from "@/lib/money";
import { advanceFulfillment, markCodPaid, refundOrder, saveAdminNote } from "@/lib/order-admin";
import { OrderError } from "@/lib/orders";
import type { Permission } from "@/lib/auth/permissions";
import type { FormState } from "../newsletter";

/** Authorise, run, and translate failures into messages that are accurate and safe to show. */
async function run(
  permission: Permission,
  orderId: string,
  fn: (a: { actor: ReturnType<typeof actorFromUser>; ip: string }) => Promise<string>,
): Promise<FormState> {
  const auth = await authorize(permission);
  if (!auth.ok) return { ok: false, message: auth.error };
  try {
    const message = await fn({ actor: actorFromUser(auth.user), ip: await clientIp() });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    after(() => processNotifications().catch(() => undefined));
    return { ok: true, message };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, message: e.message };
    console.error("[admin/orders] unexpected error", e);
    return { ok: false, message: "Something went wrong. Nothing was changed. Please try again." };
  }
}

const id = z.string().min(1).max(40);
const note = z.string().trim().max(500).optional().default("");

const statusSchema = z.object({
  orderId: id,
  to: z.enum(["CONFIRMED", "PREPARING", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERED"]),
  note,
  cashCollected: z.string().optional(),
});

export async function updateStatusAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = statusSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: "Choose a valid next status." };
  return run("orders:update", p.data.orderId, async ({ actor, ip }) => {
    await advanceFulfillment({ orderId: p.data.orderId, to: p.data.to, note: p.data.note || null, cashCollected: p.data.cashCollected === "on", actor, ip });
    return "Status updated. The customer’s tracking page now shows it.";
  });
}

const cancelSchema = z.object({
  orderId: id,
  reason: z.string().trim().min(3, "Please give a reason for the cancellation").max(500),
  confirm: z.literal("on", { message: "Please tick the box to confirm the cancellation" }),
});

export async function cancelOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = cancelSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Please check the form." };
  return run("orders:cancel", p.data.orderId, async ({ actor, ip }) => {
    await advanceFulfillment({ orderId: p.data.orderId, to: "CANCELLED", note: p.data.reason, actor, ip });
    return "Order cancelled and stock returned. No refund was issued: if the customer paid, refund it below.";
  });
}

const refundSchema = z.object({
  orderId: id,
  amount: z.string().min(1, "Enter the refund amount"),
  reason: z.string().trim().min(3, "Please give a reason for the refund").max(500),
  confirm: z.literal("on", { message: "Please tick the box to confirm the refund" }),
  idempotencyKey: z.string().min(8).max(64),
});

export async function refundAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = refundSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Please check the form." };
  const paise = rupeesToPaise(p.data.amount);
  if (paise == null || paise <= 0) return { ok: false, message: "Enter a valid refund amount, e.g. 250 or 250.50." };
  return run("orders:refund", p.data.orderId, async ({ actor, ip }) => {
    const r = await refundOrder({ orderId: p.data.orderId, amountPaise: paise, reason: p.data.reason, idempotencyKey: p.data.idempotencyKey, actor, ip });
    if (r.status === "FAILED") throw new OrderError(`The payment provider rejected the refund: ${r.message ?? "unknown error"}. The order is unchanged.`, "PAYMENT");
    return r.status === "PROCESSED" ? "Refund processed." : "Refund initiated. It will be marked processed once the payment provider confirms it.";
  });
}

export async function markCodPaidAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const orderId = id.safeParse(fd.get("orderId"));
  if (!orderId.success) return { ok: false, message: "Invalid order." };
  return run("orders:update", orderId.data, async ({ actor, ip }) => {
    await markCodPaid({ orderId: orderId.data, actor, ip });
    return "Marked as paid (cash collected).";
  });
}

export async function adminNoteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ orderId: id, note: z.string().trim().max(1000) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: "The note is too long." };
  return run("orders:update", p.data.orderId, async ({ actor, ip }) => {
    await saveAdminNote({ orderId: p.data.orderId, note: p.data.note, actor, ip });
    return "Internal note saved. Customers cannot see it.";
  });
}
