import Link from "next/link";
import { AdminHeader, Panel, StatCard } from "@/components/admin/admin-ui";
import { dashboardStats, describePeriod, PERIODS, PERIOD_LABEL, resolvePeriod, salesByDay } from "@/lib/analytics";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requirePermission("analytics:read");
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const period = resolvePeriod(one("period"));
  const includeTest = one("test") === "1";
  const placed = period.from ? { placedAt: { gte: period.from, lte: period.to } } : {};

  const [stats, days, byMethod, byStatus] = await Promise.all([
    dashboardStats(period, includeTest),
    salesByDay(period, includeTest),
    db.order.groupBy({ by: ["paymentMethod"], where: { ...(includeTest ? {} : { isTest: false }), ...placed }, _count: true, _sum: { totalPaise: true } }),
    db.order.groupBy({ by: ["fulfillmentStatus"], where: { ...(includeTest ? {} : { isTest: false }), ...placed }, _count: true }),
  ]);
  const max = Math.max(1, ...days.map((d) => d.grossPaise));
  const qs = (p: string) => `?period=${p}${includeTest ? "&test=1" : ""}`;

  return (
    <>
      <AdminHeader title="Analytics" sub={<><strong>Period:</strong> {describePeriod(period)}. Sales count orders by the date they were <em>paid</em>; order counts use the date they were <em>placed</em>.</>} />
      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
        {PERIODS.map((p) => <Link key={p} href={qs(p)} aria-current={p === period.key ? "true" : undefined} className={`border px-3 py-1.5 ${p === period.key ? "border-forest bg-forest text-ivory" : "border-line bg-white hover:border-forest"}`}>{PERIOD_LABEL[p]}</Link>)}
        <Link href={`?period=${period.key}${includeTest ? "" : "&test=1"}`} className="ml-auto text-xs underline">{includeTest ? "Hide" : "Include"} test orders</Link>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Gross sales" value={formatINR(stats.grossSalesPaise)} hint={`${stats.paidOrders} paid orders`} />
        <StatCard label="Discounts" value={formatINR(stats.discountsPaise)} />
        <StatCard label="Refunds" value={formatINR(stats.refundsPaise)} />
        <StatCard label="Net sales" value={formatINR(stats.netSalesPaise)} />
        <StatCard label="Average order" value={formatINR(stats.averageOrderValuePaise)} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Sales by day (paid orders)">
          {days.length === 0 ? <p className="text-sm text-muted">No paid orders in this period yet.</p> : (
            <ul className="space-y-1.5" aria-label="Daily sales">
              {days.map((d) => (
                <li key={d.day} className="grid grid-cols-[6.5rem_1fr_7rem] items-center gap-3 text-sm">
                  <span className="text-muted">{d.day}</span>
                  <span className="h-3 bg-ivory-deep"><span className="block h-full bg-gold" style={{ width: `${Math.max(2, (d.grossPaise / max) * 100)}%` }} /></span>
                  <span className="text-right">{formatINR(d.grossPaise)} <span className="text-xs text-muted">({d.orders})</span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="space-y-8">
          <Panel title="Orders by payment method">
            {byMethod.length === 0 ? <p className="text-sm text-muted">No orders.</p> : <ul className="space-y-2 text-sm">{byMethod.map((m) => <li key={m.paymentMethod} className="flex justify-between"><span>{m.paymentMethod === "COD" ? "Cash on delivery" : m.paymentMethod === "DEV" ? "Development (test)" : "Razorpay"}</span><span>{m._count} · {formatINR(m._sum.totalPaise ?? 0)}</span></li>)}</ul>}
          </Panel>
          <Panel title="Orders by status">
            {byStatus.length === 0 ? <p className="text-sm text-muted">No orders.</p> : <ul className="space-y-2 text-sm">{byStatus.map((s) => <li key={s.fulfillmentStatus} className="flex justify-between"><span>{s.fulfillmentStatus.replaceAll("_", " ").toLowerCase()}</span><span>{s._count}</span></li>)}</ul>}
          </Panel>
          <Panel title="Bestselling products">
            {stats.bestsellers.length === 0 ? <p className="text-sm text-muted">No paid orders yet.</p> : <ol className="space-y-2 text-sm">{stats.bestsellers.map((b) => <li key={b.productId ?? b.name} className="flex justify-between gap-3"><span>{b.name}</span><span className="text-muted">{b.units} · {formatINR(b.revenuePaise)}</span></li>)}</ol>}
          </Panel>
        </div>
      </div>
    </>
  );
}
