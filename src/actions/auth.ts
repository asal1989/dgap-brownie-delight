"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSession, destroySession } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { sanitizeText } from "@/lib/utils";
import type { ActionResult } from "@/types";

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("dgap-timing-equaliser", 12);

function safeNext(next: string | undefined, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  const email = parsed.data.email.toLowerCase();

  const ip = await clientIp();
  const rl = rateLimit(`login:${ip}:${email}`, 8, 15 * 60_000);
  if (!rl.ok) return { ok: false, error: `Too many attempts. Try again in ${Math.ceil(rl.retryAfter / 60)} minute(s).` };

  const user = await prisma.customer.findUnique({ where: { email } });
  const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !valid) return { ok: false, error: "Incorrect email or password." };

  await createSession(user.id, user.role);
  const next = String(formData.get("next") ?? "");
  redirect(safeNext(next, user.role === "ADMIN" ? "/admin" : "/account"));
}

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };

  const ip = await clientIp();
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "Too many sign-ups from this network. Please try later." };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing?.passwordHash) return { ok: false, error: "An account with this email already exists. Please sign in." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const name = sanitizeText(parsed.data.name);
  // A guest record may already exist for this email; claim it so past orders attach to the new account.
  const user = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data: { name, passwordHash } })
    : await prisma.customer.create({ data: { name, email, passwordHash } });

  await createSession(user.id, user.role);
  redirect(safeNext(String(formData.get("next") ?? ""), "/account"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
