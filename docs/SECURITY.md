# Security model

## Authentication and sessions
* Passwords are hashed with **bcrypt (cost 12)**. Admin passwords require 12+ characters with mixed case and a number; customer passwords 10+ with letters and numbers.
* Sessions are **server-side rows** keyed by the SHA-256 hash of a random 256-bit token; the raw token only lives in an `httpOnly`, `SameSite=Lax`, `Secure` (in production, with the `__Host-` prefix) cookie. A database leak therefore cannot be replayed as sessions. Staff sessions last 12 hours, customers 30 days. Sessions can be revoked.
* The signed-in user's **role and active flag are re-read from the database on every request**; nothing about identity or role is trusted from the browser.
* Login: generic error messages (no account enumeration), a timing-equalising dummy hash for unknown emails, per-email and per-IP **rate limits** (PostgreSQL-backed, so they hold across serverless instances) and a **15-minute lockout after 5 failures**. Failed and successful staff logins are audited.
* Customers can never use the staff sign-in, and the `role` is never read from a request (registration always creates `CUSTOMER`).

## Authorization
* Roles: `CUSTOMER`, `STAFF`, `ADMIN`, with a permission matrix in `src/lib/auth/permissions.ts`. Staff run orders and inventory; **only admins** can refund, change settings/prices policy, export data, manage coupons/categories or read the audit log.
* **Every** admin server action, route handler and page calls `authorize(...)` / `requirePermission(...)` on the server first. Layout-level checks are *not* relied on (layouts do not re-run on client navigation). A test (`tests/unit/rbac.test.ts`) fails if any admin action forgets the check.
* Unauthenticated callers get `401`; signed-in callers without permission get `403`.

## Input handling
* All inputs are validated with **Zod** on the server (cart, checkout, coupons, product/variant data, settings, search params). Money is parsed strictly into integer paise.
* Prisma uses parameterised queries; the few raw queries use tagged templates (parameterised). React escapes output; JSON-LD is escaped against `</script>` breakout. CSV exports neutralise spreadsheet formula injection.
* Uploads: type is determined from **magic bytes** (not the filename or browser MIME), 5 MB limit, random server-generated names.
* Open-redirect protection on `?next=` (same-site relative paths only).

## Payments
* Card data never touches the server. Razorpay orders are created server-side with the **amount read from the database**.
* The checkout callback is verified by **HMAC signature** *and* by fetching the payment from Razorpay (status, amount, currency) before the order is marked paid. The webhook is verified over the **raw body**, de-duplicated by event id, and idempotent. An order can only become paid through one function that also checks amount and currency.
* Refunds are explicit admin actions with an idempotency key, recorded and audited; cancellation never refunds automatically.
* The development payment simulator is **hard-disabled in production**, and test orders are flagged and excluded from sales reports.

## Browser protections
`next.config.ts` sets a Content-Security-Policy (restricting scripts, frames and connections to self + Razorpay), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (production) and removes `X-Powered-By`. Server Actions additionally enforce Next.js' built-in origin check (CSRF protection).

## Data protection
* Guest order access uses an HMAC-signed `httpOnly` cookie; order numbers alone are not enough. Tracking by number needs the matching phone number and is rate-limited.
* Personal data is only shown to staff with the right permission; internal customer notes are admin-only. Secrets live in environment variables and are never sent to the client or logged.
* The audit log records sensitive staff actions (status changes, cancellations, refunds, price/stock/settings changes, exports, logins).

## Known limitations (be honest about them)
* CSP allows `'unsafe-inline'` for scripts because Next.js injects inline bootstrap scripts; moving to nonces would force every page to be dynamic.
* No two-factor authentication for admins yet (recommended before scaling the team).
* Rate limiting is per-key fixed window. For large-scale abuse, add an edge/WAF rule (e.g. Vercel Firewall).
* Email addresses of newsletter subscribers are stored in plain text (needed to send mail).
