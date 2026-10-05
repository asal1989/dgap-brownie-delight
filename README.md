# DGAP Brownie Delight

Premium brownie e-commerce site: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma 7 + PostgreSQL, Zod, React Hook Form.

## Features
- Storefront: home, shop (search / filters / sort / pagination), categories, product pages, build-your-box, gifting, FAQ, policies, contact form
- Persistent cart (localStorage) with animated drawer, server-priced checkout, coupons, delivery rules from admin settings
- Payments behind an abstraction (`src/lib/payments`): Cash on Delivery now, Razorpay when keys are set (signature-verified, never simulated), UPI placeholder
- WhatsApp ordering from the cart (number comes from config; nothing is hardcoded)
- Admin (`/admin`): dashboard, products, categories, orders, customers, reviews, coupons, FAQs, messages, settings
- Secure auth (bcrypt + signed httpOnly session cookie), route protection in `proxy.ts` plus a database role check on every admin page

## Setup
```bash
npm install
cp .env.example .env        # fill DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma migrate deploy   # or: npm run db:migrate (dev)
npm run db:seed             # SAMPLE data + first admin
npm run dev
```

## Notes
- All business details (phone, WhatsApp, address, hours, FSSAI, policies, delivery rules) are set in **Admin → Settings**. Nothing is invented; empty values are simply not shown.
- Seeded products are flagged **sample**: replace them and upload real photos before launch.
- Image uploads write to `public/uploads` (local disk). On serverless hosts use hosted image URLs or swap in object storage.
- This is a dynamic, database-backed app. It cannot run on GitHub Pages (static hosting). Deploy to Vercel, Railway, Render, a VPS, etc.

## Scripts
`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`
