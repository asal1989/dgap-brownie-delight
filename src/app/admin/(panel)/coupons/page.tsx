import { AdminHeader, Panel, Pill, dateTime } from "@/components/admin/admin-ui";
import { CouponForm, ToggleCoupon } from "@/components/admin/misc-forms";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  await requirePermission("coupons:write");
  const [coupons, products, categories] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <AdminHeader title="Coupons" sub="Eligibility is always re-checked on the server when an order is placed. Discounts are calculated in whole paise." />
      <div className="space-y-6">
        <Panel title="New coupon"><CouponForm products={products} categories={categories} /></Panel>
        {coupons.map((c) => (
          <Panel key={c.id}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-2xl">{c.code}</h2>
              <Pill tone={c.isActive ? "green" : "grey"}>{c.isActive ? "Active" : "Inactive"}</Pill>
              <span className="text-sm text-muted">{c.type === "PERCENT" ? `${c.value}% off` : `${formatINR(c.value)} off`} · used {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""} · {c.expiresAt ? `expires ${dateTime(c.expiresAt)}` : "no expiry"}</span>
              <span className="ml-auto"><ToggleCoupon id={c.id} active={c.isActive} /></span>
            </div>
            <details><summary className="cursor-pointer text-sm font-semibold text-forest">Edit</summary><div className="mt-4"><CouponForm coupon={c} products={products} categories={categories} /></div></details>
          </Panel>
        ))}
      </div>
    </>
  );
}
