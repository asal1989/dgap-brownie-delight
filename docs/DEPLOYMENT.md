# Deployment guide

This application needs a **Node.js server and a PostgreSQL database**. The existing GitHub Pages site is static and cannot
run it. **Keep GitHub as the source repository; deploy the app to Vercel and the database to Railway (or any hosted PostgreSQL).**

> **Status:** this guide describes the intended deployment. Nothing has been deployed from this repository yet, so a deployment
> must be performed and verified by you (checklist at the end).

## Architecture

```
Customers + Admin  →  Vercel (Next.js, serverless functions, Vercel Cron)
                          │
                          ├── Railway PostgreSQL   (all business data, sessions, outbox, rate limits)
                          ├── Vercel Blob          (product images)
                          ├── Razorpay             (payments, refunds, webhooks → /api/webhooks/razorpay)
                          └── Resend               (transactional email)
WhatsApp: customers are sent to wa.me with a prefilled enquiry. No WhatsApp API account is required.
```

## 1. Create the database (Railway)

1. Railway → *New Project* → *Provision PostgreSQL*.
2. Copy the connection string (`DATABASE_URL`). Use the **public/pooled** URL for Vercel.
3. Enable **automated backups** (see "Backups" below) before taking real orders.

## 2. Push the code

Create a new GitHub repository (or a branch of the existing one) for this project and push it. The project folder is
self-contained: `git remote add origin <url> && git push -u origin main`.

## 3. Create the Vercel project

1. Vercel → *Add New → Project* → import the repository. Framework preset: **Next.js** (auto-detected).
2. Build command: `npm run build` (runs `prisma generate` then `next build`). Install command: `npm install` (`postinstall` generates the client).
3. Add environment variables (see [ENVIRONMENT.md](ENVIRONMENT.md)). Minimum for a first deployment:
   `DATABASE_URL`, `ORDER_ACCESS_SECRET`, `SITE_URL` (only once the domain is real), `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`.
   Add the Razorpay and Resend variables when you are ready to take payments and send email.
4. **Storage:** Project → Storage → *Create Blob store* (this sets `BLOB_READ_WRITE_TOKEN`).
5. Deploy.

## 4. Run migrations and provision the admin (from your machine, pointing at the production database)

```bash
DATABASE_URL="<production url>" npm run db:deploy          # applies prisma/migrations
DATABASE_URL="<production url>" npm run db:seed            # base catalogue only: NO --dev
DATABASE_URL="<production url>" SEED_ADMIN_EMAIL=you@domain.com SEED_ADMIN_PASSWORD='…' npm run admin:create
```

Never run `--dev` seeding against production (it refuses when `NODE_ENV=production`, but do not rely on that).
You can also run `prisma migrate deploy` as a Vercel build step if you prefer; keep it out of the *runtime*.

## 5. Configure the business (Admin → Settings and Products)

Sign in at `https://<your-domain>/admin/login`, then **before opening the shop**:

1. **Prices** for every size (`Products → each product → Variants`). Confirm and activate the *Assorted Brownies 1 kg: ₹1,000* draft if that offer is right.
2. **Delivery**: options, zone fees, free-delivery threshold. WhatsApp number, contact details, Instagram.
3. **Tax**: enable only if you know the rules that apply.
4. **Policies**: replace the factual defaults with your own text if you wish.
5. Stock quantities (Inventory) for products where you want stock tracking.
6. Finally turn on **Accept online orders**.

## 6. Razorpay

1. Dashboard → API Keys → generate **test** keys first. Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. Dashboard → Webhooks → add `https://<your-domain>/api/webhooks/razorpay`, choose events
   `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`, set a secret and copy it into `RAZORPAY_WEBHOOK_SECRET`.
3. Place a test order end to end, confirm the order becomes *Paid* and the webhook shows a `200` in Razorpay's log.
4. Only then switch to live keys.

## 7. Cron

`vercel.json` schedules `/api/cron/maintenance` once a day on the Hobby plan (every 15 minutes on Pro: change the schedule). It cancels unpaid online orders after 60 minutes (returning stock),
delivers queued emails and clears expired sessions. It requires `CRON_SECRET` (Vercel sends it automatically).
**Vercel's Hobby plan only allows daily crons**; on Hobby change the schedule to daily (`0 3 * * *`) and note that unpaid-order
expiry and email retries will then run once a day.

## 8. Custom domain

Add the domain in Vercel, then set `SITE_URL=https://your-domain`. This updates canonical URLs, the sitemap, Open Graph tags and structured data.

## Backups and recovery

* **Railway**: enable scheduled backups on the Postgres service. Take a manual backup before every migration.
* **Your own dump** (any provider): `pg_dump --format=custom --file=dgap-$(date +%F).dump "$DATABASE_URL"`; restore with `pg_restore --clean --dbname "$NEW_DATABASE_URL" dgap-….dump`.
* Test a restore into a scratch database at least once. An untested backup is not a backup.
* Product images live in Vercel Blob; they are not part of the database dump. Keep the originals.
* Orders are immutable snapshots, so a restored database is internally consistent even if the catalogue changed afterwards.

## Production checklist (tick each after you have actually done it)

- [ ] Database created, backups enabled, a restore tested
- [ ] Migrations applied (`npm run db:deploy`), base seed run, admin provisioned
- [ ] Env vars set; `ORDER_ACCESS_SECRET` and `CRON_SECRET` are long random values
- [ ] Prices, delivery, WhatsApp, contact details and policies configured in Admin
- [ ] Razorpay **test** order paid end to end; webhook returns 200; refund tested from the admin
- [ ] Email provider sending a real test order email
- [ ] Image upload tested (Blob)
- [ ] `https://<domain>/api/health` returns `{"status":"ok"}`
- [ ] Lighthouse / Core Web Vitals checked on the real URL; mobile layout reviewed on a phone
- [ ] Live Razorpay keys swapped in; "Accept online orders" turned on
