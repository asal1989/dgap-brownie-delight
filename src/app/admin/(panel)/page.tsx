import Link from "next/link";
import { AdminHeader, FulfillmentPill, PaymentPill, Panel, StatCard, dateTime } from "@/components/admin/admin-ui";
import { describePeriod, dashboardStats, PERIODS, PERIOD_LABEL, resolvePeriod } from "@/lib/analytics";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { paymentMode } from "@/lib/env";

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const user = await requirePermission("orders:read");
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const period = resolvePeriod(get("period"));
  const includeTest = get("test") === "1";
  const [s, settings] = await Promise.all([dashboardStats(period, includeTest), getSettings()]);
  const canSeeMoney = can(user.role, "analytics:read");
  const link = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ period: period.key, ...(includeTest ? { test: "1" } : {}) });
    for (const [k, v] of Object.entries(over)) {
      if (v === undefined) p.delete(k);
      else p.set(k, v);
    }
    return `/admin?${p}`;
  };

  const warnings: string[] = [];
  if (!settings.orderingEnabled) warnings.push("The shop is closed to online orders. Turn it on in Settings once prices and delivery are set.");
  if (!settings.whatsappNumber && !env().WHATSAPP_NUMBER) warnings.push("No WhatsApp number is configured, so WhatsApp buttons are inactive.");
  if (settings.deliveryOptions.every((o) => o.feePaise === 0) && settings.deliveryZones.length === 0) warnings.push("Delivery charges are not configured (all delivery options are free).");
  if (paymentMode() === "dev") warnings.push("Payments are in development mode (simulated). Configure Razorpay before taking real orders.");

  return (
    <>
      <AdminHeader title="Dashboard" sub={<>Figures are calculated from real orders, payments and refunds. <strong>Period:</strong> {describePeriod(period)}.</>} />

      {warnings.length > 0 && (
        <ul className="mb-8 space-y-2" aria-label="Setup warnings">
          {warnings.map((w) => <li key={w} className="border-l-[3px] border-gold bg-white px-4 py-3 text-sm">{w}</li>)}
          <li className="text-xs"><Link href="/admin/settings" className="link-underline text-forest">Open settings</Link></li>
        </ul>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm" aria-label="Reporting period">
        {PERIODS.map((p) => (
          <Link key={p} href={link({ period: p })} aria-current={p === period.key ? "true" : undefined} className={`border px-3 py-1.5 ${p === period.key ? "border-forest bg-forest text-ivory" : "border-line bg-white hover:border-forest"}`}>{PERIOD_LABEL[p]}</Link>
        ))}
        <Link href={link({ test: includeTest ? undefined : "1" })} className="ml-auto text-xs underline">{includeTest ? "Hide" : "Include"} test orders</Link>
      </div>

      <h2 className="eyebrow mb-3">Orders</h2>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total orders" value={s.totalOrders} hint={`Placed in period: ${period.label.toLowerCase()}`} testId="stat-total" />
        <StatCard label="Orders today" value={s.ordersToday} hint="Placed since midnight IST" />
        <StatCard label="Pending payment" value={s.pending} hint="Open now" />
        <StatCard label="Confirmed" value={s.confirmed} hint="Open now, not yet started" />
        <StatCard label="In preparation" value={s.preparing} hint="Open now" />
        <StatCard label="Ready for dispatch" value={s.readyForDispatch} hint="Open now" />
        <StatCard label="Completed" value={s.completed} hint="Delivered, placed in period" />
        <StatCard label="Cancelled" value={s.cancelled} hint="Placed in period" />
      </div>

      {canSeeMoney && (
        <>
          <h2 className="eyebrow mb-3">Sales ({period.label.toLowerCase()})</h2>
          <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Gross sales" value={formatINR(s.grossSalesPaise)} hint={`${s.paidOrders} paid order${s.paidOrders === 1 ? "" : "s"}, by payment date`} testId="stat-gross" />
            <StatCard label="Discounts given" value={formatINR(s.discountsPaise)} hint="Coupons, already deducted" />
            <StatCard label="Refunds" value={formatINR(s.refundsPaise)} hint="Processed in period" />
            <StatCard label="Net sales" value={formatINR(s.netSalesPaise)} hint="Gross − refunds" testId="stat-net" />
            <StatCard label="Average order" value={formatINR(s.averageOrderValuePaise)} hint="Gross ÷ paid orders" />
          </div>
        </>
      )}

      <div className="grid gap-8 xl:grid-cols-2">
        <Panel title="Recent orders">
          {s.recent.length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {s.recent.map((o) => (
                    <tr key={o.id}>
                      <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-forest underline">{o.orderNumber}</Link><br /><span className="text-xs text-muted">{dateTime(o.placedAt)}</span></td>
                      <td>{o.customerName}</td>
                      <td>{formatINR(o.totalPaise)}</td>
                      <td className="space-y-1"><FulfillmentPill status={o.fulfillmentStatus} /><br /><PaymentPill status={o.paymentStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-8">
          <Panel title="Bestselling products">
            {s.bestsellers.length === 0 ? <p className="text-sm text-muted">No paid orders in this period yet.</p> : (
              <ol className="space-y-2 text-sm">
                {s.bestsellers.map((b) => <li key={b.productId ?? b.name} className="flex justify-between gap-3"><span>{b.name}</span><span className="text-muted">{b.units} sold{canSeeMoney ? ` · ${formatINR(b.revenuePaise)}` : ""}</span></li>)}
              </ol>
            )}
          </Panel>
          <Panel title="Low-stock alerts">
            {s.lowStock.length === 0 ? <p className="text-sm text-muted">No tracked variants are at or below their threshold.</p> : (
              <ul className="space-y-2 text-sm">
                {s.lowStock.map((v) => <li key={v.id} className="flex justify-between gap-3"><span>{v.product} ({v.label})</span><span className={v.stock === 0 ? "font-semibold text-danger" : "text-gold-deep"}>{v.stock} left</span></li>)}
              </ul>
            )}
            <p className="mt-3 text-xs"><Link href="/admin/inventory" className="link-underline text-forest">Manage inventory</Link></p>
          </Panel>
        </div>
      </div>
    </>
  );
}
