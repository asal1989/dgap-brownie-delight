import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { db } from "../db";
import { env } from "../env";
import type { Role } from "@/generated/prisma/enums";

/** `__Host-` prefix (Secure, path=/, no Domain) is only valid over HTTPS, i.e. in production. */
export const SESSION_COOKIE = env().NODE_ENV === "production" ? "__Host-dgap_session" : "dgap_session";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

const CUSTOMER_TTL_MS = 30 * 24 * 3600 * 1000;
const STAFF_TTL_MS = 12 * 3600 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
};

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Create a server-side session and set the cookie. Staff sessions are shorter-lived. */
export async function createSession(user: { id: string; role: Role }): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const ttl = user.role === "CUSTOMER" ? CUSTOMER_TTL_MS : STAFF_TTL_MS;
  const h = await headers();
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + ttl),
      userAgent: h.get("user-agent")?.slice(0, 200) ?? null,
      ip: (await clientIp()).slice(0, 64),
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env().NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(ttl / 1000),
  });
}

/** The signed-in user for this request (or null). Role and active flag are re-read from the database every time. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const { id, email, name, phone, role } = session.user;
  return { id, email, name, phone, role };
});

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Revoke every session for a user (password change, deactivation). */
export const revokeUserSessions = (userId: string) => db.session.deleteMany({ where: { userId } });
