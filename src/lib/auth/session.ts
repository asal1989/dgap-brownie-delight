import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

export const SESSION_COOKIE = "dgap_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export interface Session {
  userId: string;
  role: "CUSTOMER" | "ADMIN";
}

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ characters)");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string, role: Session["role"]): Promise<void> {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return { userId: payload.sub, role: payload.role === "ADMIN" ? "ADMIN" : "CUSTOMER" };
  } catch {
    return null;
  }
}

/** Re-checks the role against the database so a demoted admin loses access immediately. */
export async function requireAdmin() {
  const s = await readSession();
  if (!s) redirect("/login?next=/admin");
  const user = await prisma.customer.findUnique({ where: { id: s.userId } });
  if (!user || user.role !== "ADMIN") redirect("/login?next=/admin");
  return user;
}

export async function requireUser() {
  const s = await readSession();
  if (!s) redirect("/login?next=/account");
  const user = await prisma.customer.findUnique({ where: { id: s.userId } });
  if (!user) redirect("/login?next=/account");
  return user;
}

export async function currentUser() {
  const s = await readSession();
  if (!s) return null;
  return prisma.customer.findUnique({ where: { id: s.userId }, select: { id: true, name: true, role: true } });
}
