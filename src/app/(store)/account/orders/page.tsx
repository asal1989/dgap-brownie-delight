import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/orders/status";

export const metadata: Metadata = { title: "My orders", robots: { index: false, follow: false } };

export default async function MyOrdersPage() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { customerId: user.id },
    include: { items: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <>
      <PageHeader title="My orders" crumbs={[{ label: "Home", href: "/" }, { label: "Account", href: "/account" }, { label: "Orders" }]} />
      <div className="container-page max-w-3xl py-12">
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" text="Your first box is a click away.">
            <ButtonLink href="/shop">Explore brownies</ButtonLink>
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.id} className="rounded-3xl border border-beige bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-choc">{o.orderNumber}</p>
                  <span className="rounded-full bg-beige px-3 py-1 text-xs font-bold uppercase tracking-wider text-choc">{STATUS_LABEL[o.status]}</span>
                </div>
                <p className="mt-1 text-sm text-ink/70">{o.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })} · {o.items.reduce((n, i) => n + i.quantity, 0)} items</p>
                <ul className="mt-3 text-sm text-ink/80">
                  {o.items.map((i) => <li key={i.id}>{i.quantity} × {i.name}</li>)}
                </ul>
                <p className="mt-3 font-bold text-choc">{formatINR(o.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
