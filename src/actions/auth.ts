"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { burnPasswordCheck, hashPassword, passwordSchema, verifyPassword } from "@/lib/auth/password";
import { isStaff } from "@/lib/auth/permissions";
import { clientIp, createSession, destroySession } from "@/lib/auth/session";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";
import type { FormState } from "./newsletter";

const GENERIC_LOGIN_ERROR = "Incorrect email or password.";
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(128),
});

async function authenticate(formData: FormData, staffOnly: boolean): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: GENERIC_LOGIN_ERROR };
  const { email, password } = parsed.data;

  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login-ip:${ip}`, { limit: LIMITS.login.limit * 3, windowSec: LIMITS.login.windowSec }),
    rateLimit(`login:${email}`, LIMITS.login),
  ]);
  if (!byIp.ok || !byEmail.ok) {
    return { ok: false, error: `Too many attempts. Please try again in ${Math.ceil(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec) / 60)} minute(s).` };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    await burnPasswordCheck(password);
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, error: "This account is temporarily locked after repeated failed sign-ins. Please try again later." };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failures = user.failedLoginCount + 1;
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: failures, lockedUntil: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
    });
    if (isStaff(user.role)) await audit({ id: user.id, label: user.email }, "auth.login.failed", "User", user.id, { failures }, db, ip);
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }
  // A customer must not be able to use the staff entrance (and we do not reveal which side failed).
  if (staffOnly && !isStaff(user.role)) return { ok: false, error: GENERIC_LOGIN_ERROR };

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  await createSession(user);
  if (isStaff(user.role)) await audit({ id: user.id, label: user.email }, "auth.login", "User", user.id, undefined, db, ip);
  return { ok: true, userId: user.id };
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const r = await authenticate(formData, false);
  if (!r.ok) return { ok: false, message: r.error };
  redirect(safeNext(formData.get("next"), "/account"));
}

export async function adminLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const r = await authenticate(formData, true);
  if (!r.ok) return { ok: false, message: r.error };
  redirect("/admin");
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
  password: passwordSchema,
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your details" };

  const limit = await rateLimit(`register:${await clientIp()}`, LIMITS.register);
  if (!limit.ok) return { ok: false, message: "Too many sign-up attempts. Please try again later." };

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { ok: false, message: "An account with this email already exists. Try signing in." };

  // Customers are always created with the CUSTOMER role; the role is never read from the request.
  const user = await db.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), role: "CUSTOMER" },
  });
  await createSession(user);
  redirect(safeNext(formData.get("next"), "/account"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
