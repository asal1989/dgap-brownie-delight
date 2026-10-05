import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle, StatusPill } from "@/components/admin/bits";
import { Panel, adminInput } from "@/components/admin/fields";
import { PrintButton } from "@/components/admin/print-button";
import { markCodPaid, updateOrderStatus } from "@/actions/admin";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/orders/status";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, address: true, payment: true, coupon: true } });
  if (!order) notFound();
  const locked = order.status === "CANCELLED";

  return (
    <>
      <AdminTitle title={`Order ${order.orderNumber}`} action={<div className="flex gap-2"><Link href="/admin/orders" className="no-print inline-flex min-h-10 items-center rounded-full border border-beige bg-white px-5 text-sm font-semibold hover:bg-beige/50">← All orders</Link><PrintButton /></div>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Items">
            <ul className="divide-y divide-beige">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
                  <span>{i.quantity} × {i.name} <span className="text-ink/50">@ {formatINR(i.unitPrice)}</span></span>
                  <span className="font-semibold">{formatINR(i.quantity * i.unitPrice)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-beige pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {order.discount > 0 ? <div className="flex justify-between"><dt>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</dt><dd>−{formatINR(order.discount)}</dd></div> : null}
              <div className="flex justify-between"><dt>Delivery</dt><dd>{formatINR(order.deliveryFee)}</dd></div>
              <div className="flex justify-between text-base font-bold text-choc"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Delivery">
            <address className="text-sm not-italic leading-relaxed">
              <strong>{order.address.fullName}</strong><br />
              {order.address.line1}, {order.address.area}<br />
              {order.address.city}, {order.address.state} {order.address.pincode}<br />
              Phone: {order.address.phone}
            </address>
            {order.deliveryInstructions ? <p className="mt-3 text-sm"><strong>Instructions:</strong> {order.deliveryInstructions}</p> : null}
            {order.notes ? <p className="mt-1 text-sm"><strong>Notes:</strong> {order.notes}</p> : null}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Status">
            <p className="mb-3"><StatusPill status={order.status} /></p>
            {locked ? (
              <p className="text-sm text-ink/60">Cancelled orders can&apos;t be changed (stock was restored).</p>
            ) : (
              <form key={order.status} action={updateOrderStatus} className="no-print space-y-3">
                <input type="hidden" name="id" value={order.id} />
                <select name="status" defaultValue={order.status} aria-label="Order status" className={adminInput}>
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <button className="min-h-11 w-full rounded-full bg-choc text-sm font-semibold text-cream hover:bg-espresso">Update status</button>
              </form>
            )}
          </Panel>
          <Panel title="Customer">
            <p className="text-sm font-semibold">{order.customerName}</p>
            <p className="text-sm">{order.customerPhone}</p>
            {order.customerEmail ? <p className="break-all text-sm">{order.customerEmail}</p> : null}
            <p className="mt-2 text-xs text-ink/50">Placed {order.createdAt.toLocaleString("en-IN")}</p>
          </Panel>
          <Panel title="Payment">
            {order.payment ? (
              <>
                <p className="text-sm">{order.payment.method} · <strong>{order.payment.status}</strong></p>
                <p className="text-sm">{formatINR(order.payment.amount)}</p>
                {order.payment.providerPaymentId ? <p className="break-all text-xs text-ink/50">Ref: {order.payment.providerPaymentId}</p> : null}
                {order.payment.method === "COD" && order.payment.status === "PENDING" && !locked ? (
                  <form action={markCodPaid} className="no-print mt-3">
                    <input type="hidden" name="id" value={order.id} />
                    <button className="min-h-10 w-full rounded-full border border-choc text-sm font-semibold text-choc hover:bg-choc hover:text-cream">Mark cash as received</button>
                  </form>
                ) : null}
              </>
            ) : <p className="text-sm text-ink/60">No payment record.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
