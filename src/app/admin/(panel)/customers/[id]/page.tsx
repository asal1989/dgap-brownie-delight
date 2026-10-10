import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, FulfillmentPill, Panel, PaymentPill, dateTime } from "@/components/admin/admin-ui";
import { CustomerNoteForm } from "@/components/admin/misc-forms";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const staff = await requirePermission("customers:read");
  const { id } = await params;
  const customer = await db.user.findFirst({
    where: { id, role: "CUSTOMER" },
    include: { orders: { orderBy: { placedAt: "desc" }, take: 50 }, reviews: { select: { id: true, verifiedPurchase: true } } },
  });
  if (!customer) notFound();
  const completed = customer.orders.filter((o) => o.fulfillmentStatus === "DELIVERED" && !o.isTest);
  const canNote = can(staff.role, "customers:notes");
  return (
    <>
      <AdminHeader title={customer.name} sub={`Joined ${dateTime(customer.createdAt)}`} actions={<Link href="/admin/customers" className="btn btn-outline btn-sm">← Customers</Link>} />
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-8">
          <Panel title="Contact">
            <p>{customer.email}</p><p className="text-muted">{customer.phone ?? "No phone saved"}</p>
            <p className="mt-4 text-sm text-muted">{completed.length} completed order(s) worth {formatINR(completed.reduce((s, o) => s + o.totalPaise, 0))}. {customer.reviews.filter((r) => r.verifiedPurchase).length} verified-purchase review(s).</p>
          </Panel>
          {canNote && <Panel title="Internal note (admins only)"><CustomerNoteForm userId={customer.id} note={customer.internalNote ?? ""} /></Panel>}
        </div>
        <Panel title="Order history">
          {customer.orders.length === 0 ? <p className="text-sm text-muted">No orders.</p> : (
            <div className="table-wrap"><table className="table"><thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>{customer.orders.map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-forest underline">{o.orderNumber}</Link></td><td>{dateTime(o.placedAt)}</td><td>{formatINR(o.totalPaise)}</td><td className="space-y-1"><FulfillmentPill status={o.fulfillmentStatus} /><br /><PaymentPill status={o.paymentStatus} /></td></tr>)}</tbody></table></div>
          )}
        </Panel>
      </div>
    </>
  );
}
