import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Optimistic gate: unauthenticated visitors never reach /admin or /account.
// Every admin page and action additionally calls requireAdmin(), which checks the database.
export async function proxy(req: NextRequest) {
  const token = req.cookies.get("dgap_session")?.value;
  let role: string | null = null;
  if (token && process.env.AUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      role = typeof payload.role === "string" ? payload.role : null;
    } catch {
      role = null;
    }
  }
  const { pathname } = req.nextUrl;
  const blocked =
    (pathname.startsWith("/admin") && role !== "ADMIN") || (pathname.startsWith("/account") && !role);
  if (blocked) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/account/:path*"] };
