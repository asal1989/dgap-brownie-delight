import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getSettings } from "@/lib/config";
import { ButtonLink } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { buildEnquiryMessage, whatsappLink } from "@/lib/whatsapp";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false, follow: false } };

export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  const { o } = await searchParams;
  if (!o) notFound();
  const order = await prisma.order.findUnique({
    where: { publicId: o },
    include: { items: true, address: true, payment: true },
  });
  if (!order) notFound();
  const s = await getSettings();
  const paid = order.payment?.status === "PAID";

  return (
    <div className="container-page max-w-3xl py-14 lg:py-20">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-16 text-success" aria-hidden />
        <h1 className="mt-5 text-balance text-4xl font-semibold text-choc sm:text-5xl">Your brownie journey has begun! 🍫</h1>
        <p className="mt-3 text-lg text-ink/70">
          Order <strong className="text-choc">{order.orderNumber}</strong> is {paid ? "paid and confirmed" : "placed"}.
          {order.customerEmail ? "" : ""}
        </p>
      </div>

      <section className="mt-10 rounded-3xl border border-beige bg-white p-6 sm:p-8" aria-labelledby="summary-h">
        <h2 id="summary-h" className="font-display text-2xl text-choc">Order summary</h2>
        <ul className="mt-4 divide-y divide-beige">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-beige">
                <SmartImage src={i.image} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <span className="flex-1 text-sm font-semibold">{i.quantity} × {i.name}</span>
              <span className="font-bold">{formatINR(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-beige pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
          {order.discount > 0 ? <div className="flex justify-between text-success"><dt>Discount</dt><dd>−{formatINR(order.discount)}</dd></div> : null}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{order.deliveryFee ? formatINR(order.deliveryFee) : "Free"}</dd></div>
          <div className="flex justify-between text-lg font-bold text-choc"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
        </dl>
      </section>

      <section className="mt-6 grid gap-6 rounded-3xl border border-beige bg-white p-6 sm:grid-cols-2 sm:p-8">
        <div>
          <h2 className="font-display text-xl text-choc">Delivering to</h2>
          <address className="mt-2 text-sm not-italic text-ink/75">
            {order.address.fullName}<br />
            {order.address.line1}, {order.address.area}<br />
            {order.address.city}, {order.address.state} {order.address.pincode}<br />
            {order.address.phone}
          </address>
        </div>
        <div>
          <h2 className="font-display text-xl text-choc">Payment & delivery</h2>
          <p className="mt-2 text-sm text-ink/75">
            {order.payment?.method === "COD" ? "Cash on Delivery: pay when your order arrives." : paid ? "Paid online." : "Payment pending."}
          </p>
          {s.expectedDelivery ? <p className="mt-2 text-sm text-ink/75">{s.expectedDelivery}</p> : null}
        </div>
      </section>

      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        {s.whatsappDigits ? (
          <ButtonLink
            href={whatsappLink(s.whatsappDigits, buildEnquiryMessage(s.brandName, `I have a question about order ${order.orderNumber}.`))}
            external
            variant="outline"
            size="lg"
          >
            <MessageCircle className="size-5" aria-hidden /> WhatsApp support
          </ButtonLink>
        ) : null}
        <ButtonLink href="/shop" size="lg">Continue shopping</ButtonLink>
      </div>
    </div>
  );
}
