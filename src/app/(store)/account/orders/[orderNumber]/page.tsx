import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderItems, OrderTimeline, OrderTotals } from "@/components/orders/order-parts";
import { ReviewForm } from "@/components/orders/review-form";
import { WhatsAppIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth/session";
import { getViewableOrder } from "@/lib/order-queries";
import { getSettings, resolveWhatsAppNumber } from "@/lib/settings";
import { buildWhatsAppMessage, whatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Order tracking", robots: { index: false, follow: false } };

export default async function OrderTrackingPage({ params }: PageProps<"/account/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const order = await getViewableOrder(orderNumber);
  if (!order) redirect(`/track?order=${encodeURIComponent(orderNumber)}`);

  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const canReview = user && order.userId === user.id && order.fulfillmentStatus === "DELIVERED";
  const reviewed = new Set(order.reviews.map((r) => r.productId));
  const reviewable = canReview ? order.items.filter((i) => i.productId && !reviewed.has(i.productId)) : [];
  const wa = whatsAppUrl(
    resolveWhatsAppNumber(settings),
    buildWhatsAppMessage({
      businessName: settings.businessName, orderNumber: order.orderNumber,
      lines: order.items.map((i) => ({ name: i.productName, variantLabel: i.variantLabel, quantity: i.quantity, unitPricePaise: i.unitPricePaise })),
      subtotalPaise: order.subtotalPaise, discountPaise: order.discountPaise, shippingPaise: order.shippingPaise, totalPaise: order.totalPaise,
    }),
  );
  const unpaidOnline = order.paymentStatus !== "PAID" && order.paymentMethod !== "COD" && order.fulfillmentStatus === "PENDING_PAYMENT";

  return (
    <div className="container-x grid gap-14 py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
      <div>
        <p className="eyebrow mb-3">Order tracking</p>
        <h1 className="text-5xl" data-testid="order-number">{order.orderNumber}</h1>
        <p className="mt-2 text-sm text-muted">Placed {new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(order.placedAt)}</p>
        <span className="rule-gold my-7" aria-hidden />
        <OrderTimeline
          fulfillment={order.fulfillmentStatus}
          payment={order.paymentStatus}
          events={order.history.map((h) => ({ id: h.id, kind: h.kind, toStatus: h.toStatus, note: h.note, createdAt: h.createdAt }))}
        />
        {unpaidOnline && <p className="mt-8"><Link href={`/order-success/${order.orderNumber}`} className="btn btn-primary">Complete payment</Link></p>}
      </div>

      <div className="space-y-10">
        <section aria-labelledby="oi">
          <h2 id="oi" className="mb-4 text-3xl">Items</h2>
          <OrderItems items={order.items} />
          <div className="mt-5"><OrderTotals order={order} /></div>
        </section>
        <section aria-labelledby="od">
          <h2 id="od" className="mb-3 text-3xl">Delivery</h2>
          <address className="not-italic text-muted">{order.shipName}<br />{order.shipLine1}{order.shipLine2 && <><br />{order.shipLine2}</>}<br />{order.shipCity}{order.shipState ? `, ${order.shipState}` : ""} {order.shipPostalCode}</address>
          {order.giftMessage && <p className="mt-3 text-sm text-muted">Gift message: “{order.giftMessage}”</p>}
        </section>
        {reviewable.length > 0 && (
          <section aria-labelledby="rv">
            <h2 id="rv" className="mb-3 text-3xl">How were they?</h2>
            <div className="space-y-4">{reviewable.map((i) => <ReviewForm key={i.id} orderNumber={order.orderNumber} productId={i.productId!} productName={i.productName} />)}</div>
          </section>
        )}
        {wa && <p><a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline"><WhatsAppIcon width={18} height={18} /> Message us about this order</a></p>}
      </div>
    </div>
  );
}
