import Image from "next/image";
import type { FulfillmentStatus, PaymentStatus } from "@/generated/prisma/enums";
import { formatINR } from "@/lib/money";
import { FULFILLMENT_LABEL, FULFILLMENT_STEPS, PAYMENT_LABEL } from "@/lib/order-state";

const stamp = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);
export { stamp as formatStamp };

export type TimelineEvent = { id: string; kind: string; toStatus: string; note: string | null; createdAt: Date };

const EVENT_LABEL = (e: TimelineEvent) => {
  if (e.kind === "PAYMENT") return PAYMENT_LABEL[e.toStatus as PaymentStatus] ?? e.toStatus;
  if (e.kind === "FULFILLMENT") return FULFILLMENT_LABEL[e.toStatus as FulfillmentStatus] ?? e.toStatus;
  return e.toStatus;
};

/** Customer-facing progress tracker + event log. Reads the same persisted history the admin writes. */
export function OrderTimeline({ fulfillment, payment, events }: { fulfillment: FulfillmentStatus; payment: PaymentStatus; events: TimelineEvent[] }) {
  const cancelled = fulfillment === "CANCELLED";
  const currentIndex = FULFILLMENT_STEPS.indexOf(fulfillment);
  return (
    <div>
      {cancelled ? (
        <p className="border-l-[3px] border-danger bg-white px-4 py-3 text-danger" data-testid="order-status">This order was cancelled.</p>
      ) : (
        <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
          {FULFILLMENT_STEPS.map((s, i) => {
            const done = currentIndex >= i;
            const current = currentIndex === i;
            return (
              <li key={s} aria-current={current ? "step" : undefined} className="text-center">
                <span className={`mx-auto mb-2 grid size-9 place-items-center rounded-full border text-sm ${done ? "border-forest bg-forest text-ivory" : "border-line bg-white text-muted"} ${current ? "ring-2 ring-gold ring-offset-2" : ""}`}>{done ? "✓" : i + 1}</span>
                <span className={`block text-[0.7rem] font-semibold uppercase leading-tight tracking-[0.1em] sm:text-xs ${done ? "text-forest" : "text-muted"}`}>{FULFILLMENT_LABEL[s]}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-6 text-sm">
        <span className="text-muted">Status: </span><strong data-testid="fulfillment-status">{FULFILLMENT_LABEL[fulfillment]}</strong>
        <span className="mx-2 text-line">|</span>
        <span className="text-muted">Payment: </span><strong data-testid="payment-status">{PAYMENT_LABEL[payment]}</strong>
      </p>
      <ol className="mt-6 space-y-5 border-l border-gold/60 pl-6" aria-label="Order history" data-testid="order-timeline">
        {[...events].reverse().map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[1.85rem] top-1.5 size-2.5 rounded-full bg-gold" aria-hidden />
            <p className="font-semibold text-forest">{EVENT_LABEL(e)}</p>
            {e.note && <p className="text-sm text-muted">{e.note}</p>}
            <p className="text-xs text-muted"><time dateTime={e.createdAt.toISOString()}>{stamp(e.createdAt)}</time></p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export type OrderItemView = {
  id: string; productName: string; variantLabel: string; imageUrl: string | null; unitPricePaise: number; quantity: number; lineTotalPaise: number;
  selections: unknown;
};

export function OrderItems({ items }: { items: OrderItemView[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((i) => {
        const sel = Array.isArray(i.selections) ? (i.selections as { name: string; quantity: number }[]) : [];
        return (
          <li key={i.id} className="flex gap-4 py-4">
            <span className="relative block size-16 shrink-0 overflow-hidden bg-ivory-deep">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" />}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-forest">{i.productName} <span className="font-normal text-muted">({i.variantLabel})</span></p>
              <p className="text-sm text-muted">{formatINR(i.unitPricePaise)} × {i.quantity}</p>
              {sel.length > 0 && <ul className="mt-1 text-xs text-muted">{sel.map((s) => <li key={s.name}>{s.quantity} × {s.name}</li>)}</ul>}
            </div>
            <p className="font-semibold">{formatINR(i.lineTotalPaise)}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function OrderTotals({ order }: { order: { subtotalPaise: number; discountPaise: number; shippingPaise: number; taxPaise: number; totalPaise: number; couponCode: string | null; deliveryLabel: string } }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(order.subtotalPaise)}</dd></div>
      {order.discountPaise > 0 && <div className="flex justify-between text-success"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>−{formatINR(order.discountPaise)}</dd></div>}
      <div className="flex justify-between"><dt className="text-muted">Delivery · {order.deliveryLabel}</dt><dd>{order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}</dd></div>
      {order.taxPaise > 0 && <div className="flex justify-between"><dt className="text-muted">Tax (included)</dt><dd>{formatINR(order.taxPaise)}</dd></div>}
      <div className="flex items-baseline justify-between border-t border-line pt-3"><dt className="font-semibold">Total</dt><dd className="font-serif text-2xl text-forest">{formatINR(order.totalPaise)}</dd></div>
    </dl>
  );
}
