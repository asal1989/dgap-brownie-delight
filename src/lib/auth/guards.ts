import "server-only";
import { redirect } from "next/navigation";
import { can, isStaff, type Permission } from "./permissions";
import { getCurrentUser, type SessionUser } from "./session";

/** For pages: require any signed-in user, otherwise redirect to the customer login. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`);
  return user;
}

/** For admin pages/layouts: staff only, with a specific permission. Never relies on hiding UI. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) redirect("/admin/login");
  if (!can(user.role, permission)) redirect("/admin/forbidden");
  return user;
}

export type AuthResult = { ok: true; user: SessionUser } | { ok: false; error: string; status: 401 | 403 };

/**
 * For server actions and route handlers: returns a result instead of redirecting.
 * Every administrative mutation MUST call this first; the check runs on the server on every request.
 */
export async function authorize(permission: Permission): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in as staff to do that.", status: 401 };
  if (!isStaff(user.role) || !can(user.role, permission)) return { ok: false, error: "You do not have permission to do that.", status: 403 };
  return { ok: true, user };
}
