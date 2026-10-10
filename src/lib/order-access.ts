import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";
import { getCurrentUser } from "./auth/session";
import { isStaff } from "./auth/permissions";

/**
 * Guests have no account, so the browser that placed an order holds a signed, httpOnly cookie listing its
 * order numbers. Order numbers alone are guessable and orders contain personal data, so they are never
 * enough to view an order.
 */
const COOKIE = "dgap_orders";
const MAX_ORDERS = 20;

function secret(): string {
  const s = env().ORDER_ACCESS_SECRET;
  if (s) return s;
  if (env().NODE_ENV === "production") throw new Error("ORDER_ACCESS_SECRET must be set in production");
  return "dev-only-order-access-secret";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function parse(value: string | undefined): string[] {
  if (!value) return [];
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return [];
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return [];
  try {
    const list = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, MAX_ORDERS) : [];
  } catch {
    return [];
  }
}

/** Remember that this browser may view `orderNumber`. Call from a server action or route handler. */
export async function grantOrderAccess(orderNumber: string): Promise<void> {
  const jar = await cookies();
  const list = parse(jar.get(COOKIE)?.value).filter((n) => n !== orderNumber);
  list.unshift(orderNumber);
  const payload = Buffer.from(JSON.stringify(list.slice(0, MAX_ORDERS))).toString("base64url");
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env().NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}

export async function hasOrderAccess(orderNumber: string): Promise<boolean> {
  return parse((await cookies()).get(COOKIE)?.value).includes(orderNumber);
}

/** Staff, the owning customer, or the browser that placed the order. */
export async function canViewOrder(order: { orderNumber: string; userId: string | null }): Promise<boolean> {
  const user = await getCurrentUser();
  if (user && (isStaff(user.role) || user.id === order.userId)) return true;
  return hasOrderAccess(order.orderNumber);
}
