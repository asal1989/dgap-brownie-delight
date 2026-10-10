import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/section";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from "@/lib/order-state";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { placedAt: "desc" }, take: 50, include: { items: { select: { productName: true, quantity: true } } } });
  return (
    <div className="container-narrow py-16">
      <h1 className="text-5xl">My orders</h1>
      <span className="rule-gold my-6" aria-hidden />
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" action={{ href: "/shop", label: "Browse brownies" }}>Your orders will appear here once you place one.</EmptyState>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div>
                <Link href={`/account/orders/${o.orderNumber}`} className="font-serif text-2xl text-forest hover:text-gold-deep">{o.orderNumber}</Link>
                <p className="text-sm text-muted">{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ")}</p>
                <p className="text-xs text-muted">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(o.placedAt)}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{formatINR(o.totalPaise)}</p>
                <p className="text-muted">{FULFILLMENT_LABEL[o.fulfillmentStatus]} · {PAYMENT_LABEL[o.paymentStatus]}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
