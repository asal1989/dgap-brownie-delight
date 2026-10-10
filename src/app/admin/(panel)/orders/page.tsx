import Link from "next/link";
import { AdminHeader, FulfillmentPill, PaymentPill, dateTime } from "@/components/admin/admin-ui";
import { Pagination } from "@/components/store/pagination";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { buildOrderOrderBy, buildOrderWhere, ORDER_PAGE_SIZE, parseOrderFilters, type OrderListFilters } from "@/lib/order-list";
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from "@/lib/order-state";

export const metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const user = await requirePermission("orders:read");
  const f = parseOrderFilters(await searchParams);
  const where = buildOrderWhere(f);
  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: buildOrderOrderBy(f.sort),
      skip: (f.page - 1) * ORDER_PAGE_SIZE,
      take: ORDER_PAGE_SIZE,
      include: { items: { select: { productName: true, quantity: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE));
  const qs = (over: Partial<OrderListFilters>) => {
    const m = { ...f, ...over };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(m)) if (v !== undefined && v !== "" && !(k === "sort" && v === "date-desc") && !(k === "page" && v === 1)) p.set(k, String(v));
    return p.toString() ? `?${p}` : "";
  };

  return (
    <>
      <AdminHeader
        title="Orders"
        sub={`${total} order${total === 1 ? "" : "s"} match. Test orders are hidden unless you include them.`}
        actions={can(user.role, "orders:export") ? <a href={`/admin/orders/export${qs({ page: 1 })}`} className="btn btn-outline btn-sm">Export CSV</a> : undefined}
      />

      <form method="get" className="no-print mb-6 grid gap-3 border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Filter orders">
        <label className="field lg:col-span-2"><span className="label">Search</span><input name="q" defaultValue={f.q ?? ""} className="input" placeholder="Order number, customer, phone or email" /></label>
        <label className="field"><span className="label">Fulfilment</span>
          <select name="status" defaultValue={f.status ?? ""} className="select"><option value="">Any</option>{Object.entries(FULFILLMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="field"><span className="label">Payment</span>
          <select name="payment" defaultValue={f.payment ?? ""} className="select"><option value="">Any</option>{Object.entries(PAYMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="field"><span className="label">From</span><input type="date" name="from" defaultValue={f.from ?? ""} className="input" /></label>
        <label className="field"><span className="label">To</span><input type="date" name="to" defaultValue={f.to ?? ""} className="input" /></label>
        <label className="field"><span className="label">Sort</span>
          <select name="sort" defaultValue={f.sort} className="select">
            <option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="total-desc">Highest total</option><option value="total-asc">Lowest total</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="test" value="1" defaultChecked={Boolean(f.test)} className="accent-forest" /> Include test orders</label>
        <div className="flex items-end gap-2 lg:col-span-2">
          <button type="submit" className="btn btn-primary btn-sm">Apply</button>
          <Link href="/admin/orders" className="btn btn-outline btn-sm">Reset</Link>
        </div>
      </form>

      <div className="table-wrap border border-line bg-white">
        <table className="table" data-testid="orders-table">
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Phone</th><th>Items</th><th>Total</th><th>Payment</th><th>Fulfilment</th><th>Delivery</th><th>Updated</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-muted">No orders match these filters.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-forest underline" data-testid="order-link">{o.orderNumber}</Link>{o.isTest && <span className="ml-1 text-[0.65rem] uppercase text-gold-deep">test</span>}</td>
                <td className="whitespace-nowrap">{dateTime(o.placedAt)}</td>
                <td>{o.customerName}</td>
                <td className="whitespace-nowrap">{o.customerPhone}</td>
                <td className="max-w-[16rem] text-muted">{o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</td>
                <td className="whitespace-nowrap font-semibold">{formatINR(o.totalPaise)}</td>
                <td><PaymentPill status={o.paymentStatus} /></td>
                <td><FulfillmentPill status={o.fulfillmentStatus} /></td>
                <td className="whitespace-nowrap text-muted">{o.deliveryLabel}</td>
                <td className="whitespace-nowrap text-muted">{dateTime(o.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={f.page} pages={pages} hrefFor={(n) => `/admin/orders${qs({ page: n })}`} />
    </>
  );
}
