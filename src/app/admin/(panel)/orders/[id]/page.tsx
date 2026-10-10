import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions, PrintButton } from "@/components/admin/order-actions";
import { AdminHeader, FulfillmentPill, Panel, PaymentPill, dateTime } from "@/components/admin/admin-ui";
import { OrderItems, OrderTotals } from "@/components/orders/order-parts";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { canCancel, needsRefund, nextFulfillmentSteps, PAYMENT_LABEL, FULFILLMENT_LABEL } from "@/lib/order-state";
import type { FulfillmentStatus, PaymentStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const user = await requirePermission("orders:read");
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "asc" } },
      refunds: { orderBy: { createdAt: "asc" } },
      history: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) notFound();

  const refundedOrPending = order.refunds.filter((r) => r.status !== "FAILED").reduce((s, r) => s + r.amountPaise, 0);
  const refundable = order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED" ? order.totalPaise - refundedOrPending : 0;
  const stateOrder = { fulfillmentStatus: order.fulfillmentStatus, paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod };

  const label = (kind: string, status: string) =>
    kind === "PAYMENT" ? PAYMENT_LABEL[status as PaymentStatus] ?? status : kind === "FULFILLMENT" ? FULFILLMENT_LABEL[status as FulfillmentStatus] ?? status : status.replaceAll("_", " ").toLowerCase();

  return (
    <>
      <AdminHeader
        title={order.orderNumber}
        sub={<>Placed {dateTime(order.placedAt)} · {order.paymentMethod === "COD" ? "Cash on delivery" : order.paymentMethod === "DEV" ? "Development payment (test)" : "Online payment"}{order.isTest && " · TEST ORDER"}</>}
        actions={<><PrintButton /><Link href="/admin/orders" className="btn btn-outline btn-sm">← All orders</Link></>}
      />

      <div className="mb-8 flex flex-wrap items-center gap-3" data-testid="admin-statuses">
        <FulfillmentPill status={order.fulfillmentStatus} /> <PaymentPill status={order.paymentStatus} />
        {needsRefund(stateOrder) && <span className="text-sm font-semibold text-danger">Cancelled after payment: refund required</span>}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Panel title="Items">
            <OrderItems items={order.items} />
            <div className="mt-5 max-w-sm ml-auto"><OrderTotals order={order} /></div>
          </Panel>

          <div className="grid gap-8 md:grid-cols-2">
            <Panel title="Customer">
              <p className="font-semibold">{order.customerName}</p>
              <p className="text-sm text-muted">{order.customerPhone}</p>
              {order.customerEmail && <p className="text-sm text-muted">{order.customerEmail}</p>}
              <p className="mt-3 text-xs text-muted">{order.user ? <>Registered customer: <Link className="underline" href={can(user.role, "customers:read") ? `/admin/customers/${order.user.id}` : "#"}>{order.user.email}</Link></> : "Guest checkout"}</p>
            </Panel>
            <Panel title="Shipping address">
              <address className="text-sm not-italic text-muted">{order.shipName}<br />{order.shipPhone}<br />{order.shipLine1}{order.shipLine2 && <><br />{order.shipLine2}</>}<br />{order.shipCity}{order.shipState ? `, ${order.shipState}` : ""} {order.shipPostalCode}</address>
              <p className="mt-3 text-xs text-muted">Delivery: {order.deliveryLabel}</p>
            </Panel>
          </div>

          {(order.deliveryNote || order.giftMessage || order.customerNote) && (
            <Panel title="Customer notes">
              {order.deliveryNote && <p className="text-sm"><span className="eyebrow">Delivery instructions</span><br />{order.deliveryNote}</p>}
              {order.giftMessage && <p className="mt-3 text-sm"><span className="eyebrow">Gift message</span><br />{order.giftMessage}</p>}
              {order.customerNote && <p className="mt-3 text-sm"><span className="eyebrow">Note</span><br />{order.customerNote}</p>}
            </Panel>
          )}

          <Panel title="Payment history">
            {order.payments.length === 0 ? <p className="text-sm text-muted">No payment attempts yet.</p> : (
              <div className="table-wrap"><table className="table"><thead><tr><th>When</th><th>Provider</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead>
                <tbody>{order.payments.map((p) => <tr key={p.id}><td>{dateTime(p.createdAt)}</td><td>{p.provider}</td><td>{formatINR(p.amountPaise)}</td><td>{p.status}{p.failureReason ? ` · ${p.failureReason}` : ""}</td><td className="break-all text-xs text-muted">{p.providerPaymentId ?? p.providerOrderId ?? "—"}</td></tr>)}</tbody></table></div>
            )}
            {order.refunds.length > 0 && (
              <div className="mt-6"><h3 className="eyebrow mb-2">Refunds</h3>
                <div className="table-wrap"><table className="table"><thead><tr><th>When</th><th>Amount</th><th>Status</th><th>Reason</th></tr></thead>
                  <tbody>{order.refunds.map((r) => <tr key={r.id}><td>{dateTime(r.createdAt)}</td><td>{formatINR(r.amountPaise)}</td><td>{r.status}{r.failureReason ? ` · ${r.failureReason}` : ""}</td><td>{r.reason}</td></tr>)}</tbody></table></div>
              </div>
            )}
          </Panel>

          <Panel title="Timeline (fulfilment, payment and notes)">
            <ol className="space-y-4 border-l border-gold/60 pl-6" data-testid="admin-timeline">
              {[...order.history].reverse().map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[1.85rem] top-1.5 size-2.5 rounded-full bg-gold" aria-hidden />
                  <p className="font-semibold text-forest">{h.kind === "NOTE" ? "Note" : h.kind === "PAYMENT" ? "Payment" : "Fulfilment"}: {label(h.kind, h.toStatus)}{h.fromStatus && <span className="font-normal text-muted"> (from {label(h.kind, h.fromStatus)})</span>}{!h.customerVisible && <span className="ml-2 text-[0.65rem] uppercase text-gold-deep">internal</span>}</p>
                  {h.note && <p className="text-sm text-muted">{h.note}</p>}
                  <p className="text-xs text-muted">{dateTime(h.createdAt)} · {h.actorLabel}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <OrderActions
          orderId={order.id}
          nextSteps={can(user.role, "orders:update") ? nextFulfillmentSteps(stateOrder) : []}
          canUpdate={can(user.role, "orders:update")}
          canCancel={can(user.role, "orders:cancel") && canCancel(stateOrder)}
          canRefund={can(user.role, "orders:refund")}
          codUnpaid={order.paymentMethod === "COD" && order.paymentStatus === "PENDING" && order.fulfillmentStatus !== "CANCELLED"}
          refundable={refundable}
          refundableLabel={formatINR(refundable)}
          adminNote={order.adminNote ?? ""}
          isCod={order.paymentMethod === "COD"}
          needsRefundNow={needsRefund(stateOrder)}
        />
      </div>
    </>
  );
}
