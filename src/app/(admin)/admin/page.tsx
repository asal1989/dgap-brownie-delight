import type { Metadata } from "next";
import { IndianRupee, Package, ShoppingBasket, Users, Clock } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle, DashboardCard, EmptyRow, TableWrap, td, th } from "@/components/admin/bits";
import { OrderTable } from "@/components/admin/order-table";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const notCancelled = { status: { not: "CANCELLED" as const } };
  const [revenue, orders, products, customers, pending, recent, top] = await Promise.all([
    prisma.order.aggregate({ where: notCancelled, _sum: { total: true } }),
    prisma.order.count(),
    prisma.product.count(),
    prisma.customer.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { payment: true } }),
    prisma.orderItem.groupBy({
      by: ["name"],
      where: { order: notCancelled },
      _sum: { quantity: true, unitPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  return (
    <>
      <AdminTitle title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardCard label="Revenue" value={formatINR(revenue._sum.total ?? 0)} hint="All orders except cancelled" icon={<IndianRupee className="size-5 text-caramel" aria-hidden />} />
        <DashboardCard label="Orders" value={orders} icon={<Package className="size-5 text-caramel" aria-hidden />} />
        <DashboardCard label="Pending orders" value={pending} hint={pending ? "Need your attention" : "All caught up"} icon={<Clock className="size-5 text-caramel" aria-hidden />} />
        <DashboardCard label="Products" value={products} icon={<ShoppingBasket className="size-5 text-caramel" aria-hidden />} />
        <DashboardCard label="Customers" value={customers} icon={<Users className="size-5 text-caramel" aria-hidden />} />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_22rem]">
        <section aria-labelledby="recent-h">
          <h2 id="recent-h" className="mb-3 font-display text-xl text-heading">Recent orders</h2>
          <OrderTable
            orders={recent.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              customerName: o.customerName,
              createdAt: o.createdAt,
              status: o.status,
              total: o.total,
              paymentLabel: `${o.payment?.method ?? "-"} · ${o.payment?.status ?? "-"}`,
            }))}
          />
        </section>
        <section aria-labelledby="top-h">
          <h2 id="top-h" className="mb-3 font-display text-xl text-heading">Top products</h2>
          <TableWrap>
            <thead><tr><th className={th}>Product</th><th className={`${th} text-right`}>Sold</th></tr></thead>
            <tbody>
              {top.length === 0 ? <EmptyRow cols={2} text="No sales yet." /> : null}
              {top.map((t) => (
                <tr key={t.name}><td className={td}>{t.name}</td><td className={`${td} text-right font-semibold`}>{t._sum.quantity}</td></tr>
              ))}
            </tbody>
          </TableWrap>
        </section>
      </div>
    </>
  );
}
