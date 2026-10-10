# DGAP Brownie Delight: e-commerce platform

A premium artisan-brownie storefront with a real database, checkout, payments, WhatsApp ordering and a secure admin.

| Layer | Technology |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling / motion | Tailwind CSS 4, Framer Motion, Lucide icons |
| 3D | Three.js + React Three Fiber + Drei (procedural scene, lazy-loaded, static fallback) |
| Data | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Validation / forms | Zod 4, React Hook Form |
| Auth | Own DB-backed sessions (hashed tokens), bcrypt passwords, role-based permissions |
| Payments | Razorpay (REST + signature verification), development simulator, optional COD |
| Email | Resend via a transactional outbox |
| Images | Vercel Blob (production) / local disk (development only) |
| Tests | Vitest (unit + DB integration), Playwright (E2E) + axe (accessibility) |

> The original static GitHub Pages site (`asal1989/dgap-brownie-delight`) is untouched. This is a separate, server-rendered
> application. GitHub Pages cannot host it. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Quick start (development)

Requirements: Node 20.9+ (tested on 24), npm, and PostgreSQL binaries (`initdb`, `pg_ctl`, `psql`).

```bash
npm install
cp .env.example .env            # then edit the values (see docs/ENVIRONMENT.md)
npm run db:start                # starts a project-local PostgreSQL on 127.0.0.1:5433 (data in ./.pgdata)
npm run db:migrate              # creates the schema
npm run db:seed -- --dev        # catalogue + development extras (see below)
npm run dev                     # http://localhost:3000
```

Using your own PostgreSQL instead? Skip `db:start` and set `DATABASE_URL` / `TEST_DATABASE_URL` in `.env`.

### What the seed does (and refuses to do)

`npm run db:seed` creates the 8 categories, the six brownies and a custom-box product. It **never invents prices,
stock, orders or reviews**: every brownie starts with *"price not configured"* and cannot be bought until an admin
sets a price in `/admin/products`. The one known price, **assorted brownies, 1 kg for ₹1,000**, is created as a
**draft** for an admin to confirm and activate.

`npm run db:seed -- --dev` (refused in production) additionally activates that offer, opens the shop for orders,
adds a `WELCOME10` development coupon and creates the admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

### Creating the first admin (production-safe)

There are no default credentials anywhere. Provision an admin once:

```bash
SEED_ADMIN_EMAIL=owner@yourdomain.com SEED_ADMIN_PASSWORD='a-long-unique-password' npm run admin:create
```

Passwords must be 12+ characters with upper-case, lower-case and a number. Then sign in at `/admin/login`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development, production build, production server |
| `npm run db:start` / `db:stop` | Local PostgreSQL |
| `npm run db:migrate` | Create/apply migrations (development) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Seed catalogue (`-- --dev` for development extras) |
| `npm run admin:create` | Provision an admin user |
| `npm test` | Vitest: unit + database integration tests (uses `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright E2E + accessibility + mobile tests. Builds the app, starts it on :3100 against `TEST_DATABASE_URL` and a **local fake Razorpay API**, and drives the installed Chrome (`PW_CHANNEL=msedge` to use Edge, or `npx playwright install chromium` and `PW_CHANNEL=chromium`). Takes a few minutes. |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |

## Project map

```
prisma/              schema.prisma, migrations, seed.ts
src/app/(store)/     customer pages (home, shop, product, cart, checkout, orders, policies…)
src/app/admin/       admin login + (panel)/ protected pages
src/app/api/         Razorpay webhook, cron maintenance, health
src/actions/         server actions (cart, checkout, auth, reviews, newsletter, admin/*)
src/lib/             pricing, quote, orders, payments, order state machine, auth, settings, analytics…
src/components/      UI (store, home + 3D, cart, checkout, orders, admin)
tests/               unit/, integration/ (real PostgreSQL), e2e/ (Playwright)
docs/                DEPLOYMENT.md, ENVIRONMENT.md, SECURITY.md, FEATURES.md
```

## Key design decisions

* **Money is integer paise** everywhere (no floats, no Decimal). Rupee text is parsed strictly and shown with `Intl`.
* **The server is the source of truth.** The browser sends variant ids, quantities, box selections and a coupon code.
  Prices, stock, discounts, delivery and totals are recomputed on the server in `quoteCart` and again inside the order transaction.
* **Orders are immutable snapshots.** Renaming a product or changing a price never alters past orders.
* **Stock cannot be oversold.** Checkout reserves stock with a guarded `UPDATE … WHERE stock >= qty` inside a transaction;
  cancellation returns it (once). Covered by a concurrency test.
* **Payment ≠ fulfilment.** They are separate fields with separate, validated state machines. Cancelling a paid order never
  refunds automatically; a refund is an explicit, audited, idempotent admin action through the payment provider.
* **Webhooks are verified and idempotent.** Signature checked over the raw body; each provider event id is processed once.
* **Safe by default.** The shop is closed to online orders until an admin turns it on in Settings.

See [docs/FEATURES.md](docs/FEATURES.md) for the implemented / needs-credentials checklist and
[docs/SECURITY.md](docs/SECURITY.md) for the security model.

## Testing

```bash
npm test            # 153 tests: pure logic + real-PostgreSQL integration (uses TEST_DATABASE_URL, wipes it)
npm run test:e2e    # 30 Playwright tests on a production build
```

* **Unit**: pricing, coupons, money, order state machine, WhatsApp messages, product/order filters, Razorpay signatures, delivery rules, CSV safety, upload sniffing, reporting periods, and a structural RBAC test that fails if any admin action/page/route lacks a server-side permission check.
* **Integration (PostgreSQL)**: order creation and immutability, **concurrent** overselling and coupon limits, idempotent checkout, payment capture (duplicate/mismatched/late), webhooks (bad signature, duplicates, failures), lifecycle transitions, cancellation, refunds (partial/full/idempotent), notifications outbox, inventory, analytics figures, catalogue admin.
* **E2E (Chrome)**: browse, filter, variant, cart, coupon, checkout with server-verified Razorpay payment (forged signature, tampered amount, failed payment, retry), tracking, admin status update reflected on the customer timeline, cancel + explicit refunds, inventory, product creation, settings, webhook, security headers, unauthorised access, axe accessibility on 12 pages, mobile menu/filters/overflow.
