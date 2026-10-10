# Environment variables

Copy `.env.example` to `.env` for development. In production set these in your host (Vercel → Project → Settings →
Environment Variables). Values are validated by `src/lib/env.ts`; the app fails fast with a clear message when a required one is invalid.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **yes** | PostgreSQL connection string. In production use your hosted provider's *pooled* URL if offered. |
| `TEST_DATABASE_URL` | for tests | A **separate** database whose name contains `test`. Tests refuse to run otherwise, and wipe it. |
| `SITE_URL` | recommended | Public origin without trailing slash. Used for canonical URLs, sitemap, Open Graph and structured data. Leave unset until the production domain exists (falls back to `http://localhost:3000`). |
| `ORDER_ACCESS_SECRET` | **production** | 32+ random characters. Signs the cookie that lets guest customers view the orders they placed. The app refuses to run guest order access in production without it. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `PAYMENT_MODE` | optional | `razorpay`, `dev` or `off`. Default: `razorpay` if keys are set; otherwise `dev` outside production and `off` in production. **`dev` is always refused in production.** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | for online payment | Razorpay API credentials (test keys for staging, live keys for production). Never exposed to the browser except the public key id returned when a payment starts. |
| `RAZORPAY_WEBHOOK_SECRET` | for webhooks | The secret you set when creating the webhook in the Razorpay dashboard. Without it `/api/webhooks/razorpay` answers 503. |
| `WHATSAPP_NUMBER` | optional | Digits with country code. Can instead be set in Admin → Settings (the setting wins). Nothing is hard-coded. |
| `RESEND_API_KEY` / `EMAIL_FROM` | for email | Without a key, notifications are recorded in the outbox and marked *skipped*, never silently "sent". `EMAIL_FROM` must be a verified sender in Resend. |
| `NOTIFICATIONS_DEV_LOG` | optional | `1` prints skipped emails to the server log (development only). |
| `BLOB_READ_WRITE_TOKEN` | production uploads | Vercel Blob token. Without it, uploads fall back to `public/uploads` in development and are **refused in production**. |
| `CRON_SECRET` | for cron | Bearer token required by `/api/cron/maintenance` (Vercel Cron sends it automatically when this variable is set). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | for `admin:create` | One-time admin provisioning. Remove after use. |

## Things only the business can supply

These are intentionally empty and must be configured before accepting live orders:

* **Prices** for every brownie/size/box (`/admin/products`). Unpriced items cannot be bought.
* **Delivery options, zones and charges**, and an optional free-delivery threshold (`/admin/settings`).
* **WhatsApp number**, contact email/phone/address and social links (`/admin/settings`).
* **Razorpay keys + webhook secret**, and an email provider.
* **Tax rules** (GST) if applicable, and **policy text** (shipping, refunds, privacy, terms), which the business should review.
* **Product photography** (the bundled photos are temporary Unsplash stock; see `public/images/CREDITS.md`).
