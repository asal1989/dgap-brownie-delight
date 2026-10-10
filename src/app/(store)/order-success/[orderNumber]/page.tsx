import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { OrderItems, OrderTotals } from "@/components/orders/order-parts";
import { PayPanel } from "@/components/orders/pay-panel";
import { WhatsAppIcon } from "@/components/ui/icons";
import { paymentMode } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { getViewableOrder } from "@/lib/order-queries";
import { getSettings, resolveWhatsAppNumber } from "@/lib/settings";
import { buildWhatsAppMessage, whatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

export default async function OrderSuccessPage({ params }: PageProps<"/order-success/[orderNumber]">) {
  const { orderNumber } = await params;
  const order = await getViewableOrder(orderNumber);
  if (!order) redirect(`/track?order=${encodeURIComponent(orderNumber)}`);

  const settings = await getSettings();
  const mode = paymentMode();
  const paid = order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED" || order.paymentStatus === "REFUNDED";
  const cancelled = order.fulfillmentStatus === "CANCELLED";
  const needsPayment = !cancelled && !paid && order.paymentMethod !== "COD";
  const wa = whatsAppUrl(
    resolveWhatsAppNumber(settings),
    buildWhatsAppMessage({
      businessName: settings.businessName,
      orderNumber: order.orderNumber,
      lines: order.items.map((i) => ({ name: i.productName, variantLabel: i.variantLabel, quantity: i.quantity, unitPricePaise: i.unitPricePaise })),
      subtotalPaise: order.subtotalPaise, discountPaise: order.discountPaise, shippingPaise: order.shippingPaise, totalPaise: order.totalPaise,
    }),
  );

  return (
    <div className="container-narrow py-16">
      <div className="text-center">
        <span className={`mx-auto mb-5 grid size-16 place-items-center rounded-full border ${paid || order.paymentMethod === "COD" ? "border-gold bg-forest text-gold" : "border-line bg-white text-muted"}`}>
          <Check size={30} aria-hidden />
        </span>
        <p className="eyebrow mb-3">Order {order.orderNumber}</p>
        <h1 className="text-[clamp(2.4rem,5vw,3.6rem)]" data-testid="success-heading">
          {cancelled ? "This order was cancelled" : paid ? `Thank you, ${order.customerName.split(" ")[0]}` : order.paymentMethod === "COD" ? "Your order is placed" : "Almost there"}
        </h1>
        <span className="rule-gold mx-auto my-6" aria-hidden />
        <p className="mx-auto max-w-lg text-muted">
          {cancelled ? "If you paid online, any refund will be confirmed to you separately."
            : paid ? "We have received your payment and your order is confirmed. We will keep you posted as it is prepared."
            : order.paymentMethod === "COD" ? `Please keep ${formatINR(order.totalPaise)} ready for delivery. We will confirm the details with you.`
            : "Complete the payment below to confirm your order."}
        </p>
        {order.isTest && <p className="mx-auto mt-4 inline-block border border-dashed border-gold-deep px-3 py-1 text-xs uppercase tracking-[0.14em] text-gold-deep">Test order (development payment mode)</p>}
      </div>

      {needsPayment && (
        <div className="mt-10">
          <PayPanel orderNumber={order.orderNumber} totalLabel={formatINR(order.totalPaise)} mode={order.paymentMethod === "RAZORPAY" ? (mode === "razorpay" ? "razorpay" : "off") : order.paymentMethod === "DEV" ? (mode === "dev" ? "dev" : "off") : "off"} retry={order.paymentStatus === "FAILED"} />
        </div>
      )}

      <section className="mt-12" aria-labelledby="items-title">
        <h2 id="items-title" className="mb-4 text-3xl">Your order</h2>
        <OrderItems items={order.items} />
        <div className="mt-5"><OrderTotals order={order} /></div>
      </section>

      <section className="mt-12 grid gap-8 sm:grid-cols-2" aria-label="Delivery details">
        <div>
          <h2 className="eyebrow mb-2">Delivering to</h2>
          <address className="not-italic text-muted">{order.shipName}<br />{order.shipLine1}{order.shipLine2 && <><br />{order.shipLine2}</>}<br />{order.shipCity}{order.shipState ? `, ${order.shipState}` : ""} {order.shipPostalCode}<br />{order.shipPhone}</address>
        </div>
        <div>
          <h2 className="eyebrow mb-2">Contact</h2>
          <p className="text-muted">{order.customerName}<br />{order.customerPhone}{order.customerEmail && <><br />{order.customerEmail}</>}</p>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap justify-center gap-4">
        <Link href={`/account/orders/${order.orderNumber}`} className="btn btn-primary">Track this order</Link>
        <Link href="/shop" className="btn btn-outline">Continue shopping</Link>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline"><WhatsAppIcon width={18} height={18} /> Message us about this order</a>}
      </div>
    </div>
  );
}
