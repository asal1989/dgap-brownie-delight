"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, Trash2 } from "lucide-react";
import { ButtonLink, Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { OrderSummary } from "@/components/cart/order-summary";
import { CouponField } from "@/components/cart/coupon-field";
import { WhatsAppCartButton } from "@/components/cart/whatsapp-order";
import { useSiteConfig } from "@/components/providers";
import { useCart } from "@/hooks/use-cart";
import { useQuote } from "@/hooks/use-quote";
import { formatINR } from "@/lib/utils";

export function CartView() {
  const { lines, subtotal, hydrated, actions } = useCart();
  const { freeDeliveryThreshold, minimumOrder } = useSiteConfig();
  const [coupon, setCoupon] = useState("");
  const { quote, error, loading } = useQuote(lines, coupon);

  if (!hydrated) {
    return <div className="skeleton h-64" aria-busy aria-label="Loading your cart" />;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-panel2 text-caramel">
          <ShoppingBag className="size-9" aria-hidden />
        </span>
        <h2 className="mt-6 font-display text-3xl text-heading">Your brownie box is feeling lonely.</h2>
        <p className="mt-2 text-lg text-fg/70">Let&apos;s fix that.</p>
        <ButtonLink href="/shop" size="lg" className="mt-8">Explore brownies</ButtonLink>
      </div>
    );
  }

  const remaining = freeDeliveryThreshold > 0 ? freeDeliveryThreshold - subtotal : 0;
  const belowMin = minimumOrder > 0 && subtotal < minimumOrder;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:gap-12">
      <div>
        {remaining > 0 ? (
          <p className="mb-4 rounded-md bg-panel2/60 px-4 py-3 text-sm font-medium text-heading" role="status">
            You&apos;re {formatINR(remaining)} away from free delivery.
          </p>
        ) : null}
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel px-4 sm:px-6">
          {lines.map((l) => (
            <li key={l.productId} className="flex gap-4 py-5">
              <Link href={`/shop/${l.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-md bg-panel2 sm:size-28">
                <SmartImage src={l.image} alt={l.name} fill sizes="112px" className="object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <Link href={`/shop/${l.slug}`} className="font-display text-lg font-semibold text-heading hover:underline">{l.name}</Link>
                  <span className="font-bold text-heading">{formatINR(l.price * l.quantity)}</span>
                </div>
                <p className="text-sm text-fg/70">{formatINR(l.price)} each</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <QuantityStepper value={l.quantity} min={0} label={l.name} onChange={(q) => actions.setQuantity(l.productId, q)} />
                  <button type="button" onClick={() => actions.remove(l.productId)} aria-label={`Remove ${l.name}`} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-fg/70 hover:bg-panel2/60 hover:text-danger">
                    <Trash2 className="size-4" aria-hidden /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between">
          <Link href="/shop" className="text-sm font-semibold text-caramel hover:underline">← Continue shopping</Link>
          <button type="button" onClick={actions.clear} className="text-sm font-semibold text-fg/70 hover:text-danger">Clear cart</button>
        </div>
      </div>

      <aside className="h-fit space-y-5 rounded-lg border border-line bg-panel p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl text-heading">Order summary</h2>
        <CouponField applied={quote?.couponCode ?? null} message={quote?.couponMessage ?? null} onApply={setCoupon} />
        <OrderSummary quote={quote} fallbackSubtotal={subtotal} loading={loading} />
        {error ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p> : null}
        {belowMin ? <p className="text-sm text-danger" role="alert">Minimum order is {formatINR(minimumOrder)}.</p> : null}
        {belowMin || error ? (
          <Button size="lg" className="w-full" disabled>Proceed to checkout</Button>
        ) : (
          <ButtonLink href="/checkout" size="lg" className="w-full">Proceed to checkout</ButtonLink>
        )}
        <WhatsAppCartButton className="w-full" />
      </aside>
    </div>
  );
}
