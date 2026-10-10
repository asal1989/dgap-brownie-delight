# Feature checklist

**Verified on the final code (this environment, 2026-10-10):** `tsc --noEmit` clean · ESLint clean · **153 Vitest tests passed** (unit + real-PostgreSQL integration) · **30 Playwright tests passed** on a production build (Chrome desktop + Pixel 7 mobile, axe accessibility on 12 pages) · `next build` succeeds for all 45 routes.
Payments were verified against a **local fake Razorpay API** using genuine HMAC signatures. They have **not** been run against the real Razorpay, Resend or Vercel Blob, and nothing has been deployed.

Legend: ✅ implemented **and verified by an automated test or a manual run** · 🔑 implemented, needs external credentials or business input to go live (not verified against the real service) · ⏳ not built / partial.

## Storefront
| | Feature | Notes |
|---|---|---|
| ✅ | Home with 16 sections (announcement, nav, 3D hero, bestsellers, flavours, signature, box builder, why, gifts, story, reviews, gallery, FAQ, newsletter, final CTA, footer) | E2E + axe on `/` |
| ✅ | `/shop`, `/shop/[slug]`, `/categories/[slug]`, `/gift-boxes`, `/build-your-box`, `/about`, `/contact`, `/cart`, `/checkout`, `/order-success/[n]`, `/account`, `/account/orders`, `/account/orders/[n]`, `/privacy`, `/terms`, `/shipping`, `/refunds` (+ `/track`, `/account/login`, `/account/register`) | smoke-tested; real 404s for unknown slugs |
| ✅ | Loading skeletons, error boundary, not-found, empty states (cart, search, orders, reviews, gift boxes) | |
| ✅ | Product search, category filter, price range, sort (featured/newest/price/popularity once sales exist), pagination, clear-all, mobile filter drawer | unit + E2E (desktop and mobile) |
| ✅ | Variants with SKU, weight/pieces, price in paise, compare-at, stock, availability | integration tests |
| ✅ | Persistent cart, quantity edit, remove, server-side re-pricing, stock validation, coupon, delivery, totals | E2E + integration |
| ✅ | Custom box builder with server-side validation of size, flavours and price | E2E + integration |
| ✅ | Guest checkout and signed-in checkout, address, gift message, delivery instructions, delivery options, idempotent order creation | E2E + integration |
| ✅ | Order confirmation, order history, tracking timeline driven by the same history the admin writes; guest tracking by order number + phone | E2E |
| ✅ | Reviews: verified-purchase only, moderated; honest empty state | integration/unit; moderation UI built |
| ✅ | Newsletter with explicit consent, honeypot and rate limit | built; consent enforced by schema |
| ✅ | SEO: per-page metadata, canonical, Open Graph, sitemap, robots, Product + Bakery JSON-LD (verified prices/availability only) | |
| ✅ | Accessibility: axe (WCAG 2.1 A/AA) clean on 12 storefront pages + admin login; keyboard-operable menu, dialogs, filters; reduced motion honoured | Playwright + axe |
| ✅ | Security headers incl. CSP | E2E |

## 3D and motion
| | Feature | Notes |
|---|---|---|
| ✅ | React Three Fiber hero: procedural brownie stack, gold band with the real logo, studio lighting, mouse parallax, floating motion, scroll-linked camera | verified visually in Chrome; no external model/HDRI files |
| ✅ | Lazy-loaded when idle, static photo fallback, skips on save-data / slow network / no WebGL / low-memory devices, reduced-motion renders a still frame, never blocks navigation | E2E (reduced motion) |
| ⏳ | Only the hero is 3D; other pages use CSS/Framer Motion (scroll reveals, page fade, animated nav indicator, cart badge, toasts) | by design: "selected scenes" |

## Payments, WhatsApp, notifications
| | Feature | Notes |
|---|---|---|
| ✅ | Razorpay code path (server-created orders, signature verification, authoritative payment fetch, amount + currency check, failed payment + retry, idempotent capture, webhooks with raw-body signature + event de-duplication, refunds) | E2E against a **local fake Razorpay API** with genuine HMAC signatures, plus integration tests |
| 🔑 | Real Razorpay | needs `RAZORPAY_*` keys, webhook secret and a live/test dashboard run-through |
| ✅ | Development payment simulator, hard-disabled in production, orders flagged `isTest` and excluded from reports | integration |
| ✅ | Cash on delivery (admin-enabled), cash-collected marking | integration |
| ✅ | WhatsApp enquiry messages (items, variants, quantities, totals, coupon, delivery, order number) clearly labelled "not a confirmed order" | unit |
| 🔑 | WhatsApp number | set in Admin → Settings; no number is hard-coded |
| ✅ | Transactional email outbox (retry/backoff, never blocks an order), templates for placed / paid / status / cancelled / refund | integration (skips honestly when no provider) |
| 🔑 | Email delivery | needs `RESEND_API_KEY` + a verified sender |

## Admin
| | Feature | Notes |
|---|---|---|
| ✅ | Login, DB sessions, lockout, rate limits, role matrix (CUSTOMER/STAFF/ADMIN), server-side permission checks everywhere | unit (structural RBAC test) + E2E |
| ✅ | Dashboard: totals, today, pending/confirmed/preparing/ready/completed/cancelled, gross/discounts/refunds/net/AOV, bestsellers, low stock, recent orders, **stated period** | integration (figures verified) + E2E |
| ✅ | Orders: search, filters, sort, pagination, detail, print, CSV export (permission-checked, formula-safe) | unit + E2E |
| ✅ | Status lifecycle with validated transitions, actor/from/to/note/timestamp history, customer notification, cancel with confirmation (no auto-refund), explicit refunds (partial/full, idempotent) | integration + E2E |
| ✅ | Products, variants, categories, images (upload with magic-byte check), SEO fields, archive-not-delete, inventory movements with reasons | integration + E2E |
| ✅ | Coupons (percent/fixed, minimum, window, usage + per-customer limits, product/category scope) | unit + integration |
| ✅ | Customers (profile, order history, completed value, admin-only notes), reviews moderation, analytics, settings (business, delivery zones/fees, tax, policies, payment methods, ordering switch), audit log | built + E2E on settings/audit |
| 🔑 | Image uploads in production | needs `BLOB_READ_WRITE_TOKEN` |

## Database and platform
| | Feature | Notes |
|---|---|---|
| ✅ | Prisma schema (all models requested + `Counter`, `WebhookEvent`, `Notification`, `RateLimitBucket`, `NewsletterSubscriber`), migrations, seed | |
| ✅ | Integer paise everywhere; immutable order snapshots; transactional order creation; guarded stock decrement (no oversell under concurrency); race-safe payment/refund handling | integration, including concurrency tests |
| ✅ | Seed never invents prices, stock, orders or reviews; ₹1,000 / 1 kg assorted offer created as a draft | |
| ✅ | `.env.example`, env validation, README, deployment, environment and security docs | |
| ⏳ | **Not deployed.** Nothing has been deployed to Vercel/Railway; follow `docs/DEPLOYMENT.md` | |

## Known gaps (honest list)
* Customers cannot yet manage a saved address book (the `Address` table exists; checkout captures the address per order).
* No admin screen for newsletter subscribers (they are stored with consent evidence; export via SQL for now).
* No two-factor authentication for admins; CSP keeps `'unsafe-inline'` for scripts (see SECURITY.md).
* Customer-facing cart is stored in the browser (localStorage), not server-persisted. Prices are re-validated on the server so this is safe, but carts do not follow a user between devices.
* Gallery uses product photography (no Instagram API integration); product photos are temporary stock images.
* Lighthouse / Core Web Vitals have not been measured on a deployed URL. Static design choices (lazy 3D, `next/image`, font self-hosting, server components) are in place, but the numbers are unverified.
* Live Razorpay, Resend and Vercel Blob have not been exercised (no credentials in this environment).
