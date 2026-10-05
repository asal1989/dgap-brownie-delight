import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { AdminTitle } from "@/components/admin/bits";
import { OrderTable } from "@/components/admin/order-table";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const where: Prisma.OrderWhereInput = {
    ...(status && (ORDER_STATUSES as readonly string[]).includes(status) ? { status: status as (typeof ORDER_STATUSES)[number] } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { customerPhone: { contains: q } },
            { customerEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orders = await prisma.order.findMany({ where, include: { payment: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <AdminTitle title="Orders" />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Order no., name, phone, email…" aria-label="Search orders" className="h-11 w-full max-w-sm rounded-full border border-line bg-panel px-5 text-sm outline-none focus:border-gold" />
        <select name="status" defaultValue={status ?? ""} aria-label="Filter by status" className="h-11 rounded-full border border-line bg-panel px-4 text-sm">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <button className="h-11 rounded-full bg-choc px-6 text-sm font-semibold text-cream">Filter</button>
      </form>
      <OrderTable
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          createdAt: o.createdAt,
          status: o.status,
          total: o.total,
          paymentLabel: `${o.payment?.method ?? "-"} · ${o.payment?.status ?? "-"}`,
        }))}
      />
    </>
  );
}
