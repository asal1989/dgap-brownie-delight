"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { whatsappEnquiryAction } from "@/actions/cart";
import { useCart } from "@/components/cart/cart-provider";
import { SummaryRows } from "@/components/cart/order-summary";
import { useQuote } from "@/components/cart/use-quote";
import { WhatsAppIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/section";
import { useToast } from "@/components/ui/toast";
import { formatINR } from "@/lib/money";

export function CartView() {
  const cart = useCart();
  const toast = useToast();
  const { quote, config, error, loading } = useQuote();
  const [coupon, setCoupon] = useState("");
  const [pending, startTransition] = useTransition();

  if (!cart.ready) return <div className="container-x min-h-[50vh] py-20" aria-busy="true"><p className="text-center text-muted">Loading your cart…</p></div>;

  if (cart.items.length === 0) {
    return (
      <div className="container-x py-24">
        <EmptyState title="Your cart is empty" action={{ href: "/shop", label: "Browse brownies" }}>
          Add a few brownies and they will appear here.
        </EmptyState>
      </div>
    );
  }

  const byRef = new Map((quote?.lines ?? []).map((l) => [l.ref, l]));
  const stale = cart.items.filter((i) => quote && !byRef.has(i.key));

  const enquire = () =>
    startTransition(async () => {
      const r = await whatsappEnquiryAction(cart.toInput());
      if (!r.ok) return toast.show(r.error, { tone: "error" });
      if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
      else toast.show("WhatsApp ordering has not been set up yet. Please use the contact page.", { tone: "error", href: "/contact", hrefLabel: "Contact" });
    });

  const canCheckout = Boolean(quote?.valid) && config?.orderingEnabled && !loading;

  return (
    <div className="container-x grid gap-12 py-12 lg:grid-cols-[1fr_24rem] lg:gap-16">
      <section aria-labelledby="cart-heading">
        <h1 id="cart-heading" className="text-5xl">Your cart</h1>
        <span className="rule-gold my-6" aria-hidden />

        {config && !config.orderingEnabled && (
          <p role="status" className="mb-6 border-l-[3px] border-gold bg-white px-4 py-3 text-sm">{config.closedMessage}</p>
        )}
        {error && <p role="alert" className="mb-6 text-danger">{error}</p>}
        {quote?.issues.map((i) => <p key={i} role="alert" className="mb-3 border-l-[3px] border-danger bg-white px-4 py-3 text-sm text-danger">{i}</p>)}
        {stale.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3 border-l-[3px] border-danger bg-white px-4 py-3 text-sm">
            <span>{stale.length === 1 ? "One item is" : `${stale.length} items are`} no longer available.</span>
            <button type="button" className="link-underline font-semibold text-forest" onClick={() => cart.removeMany(stale.map((s) => s.key))}>Remove {stale.length === 1 ? "it" : "them"}</button>
          </div>
        )}

        <ul className="divide-y divide-line border-y border-line" aria-busy={loading}>
          {cart.items.map((item) => {
            const line = byRef.get(item.key);
            const unit = line?.unitPricePaise ?? item.display.unitPricePaise;
            return (
              <li key={item.key} className="flex gap-5 py-6" data-testid="cart-line">
                <Link href={`/shop/${item.display.slug}`} className="relative block size-24 shrink-0 overflow-hidden bg-ivory-deep sm:size-28">
                  {item.display.image && <Image src={item.display.image} alt="" fill sizes="112px" className="object-cover" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/shop/${item.display.slug}`} className="font-serif text-2xl text-forest hover:text-gold-deep">{item.display.name}</Link>
                      <p className="text-sm text-muted">{item.display.variantLabel}</p>
                      {(line?.selections ?? []).length > 0 && (
                        <ul className="mt-1 text-xs text-muted">{line!.selections!.map((s) => <li key={s.productId}>{s.quantity} × {s.name}</li>)}</ul>
                      )}
                      {!line?.selections && item.display.selectionNames?.length ? (
                        <ul className="mt-1 text-xs text-muted">{item.display.selectionNames.map((n) => <li key={n}>{n}</li>)}</ul>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-semibold">{formatINR(unit * item.quantity)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="inline-flex items-center border border-line bg-white" role="group" aria-label={`Quantity of ${item.display.name}`}>
                      <button type="button" onClick={() => cart.setQuantity(item.key, item.quantity - 1)} className="grid size-10 place-items-center hover:bg-forest hover:text-ivory" aria-label={`Decrease quantity of ${item.display.name}`}><Minus size={15} aria-hidden /></button>
                      <output className="w-9 text-center text-sm font-semibold" aria-live="polite">{item.quantity}</output>
                      <button type="button" onClick={() => cart.setQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= 50} className="grid size-10 place-items-center hover:bg-forest hover:text-ivory disabled:opacity-30" aria-label={`Increase quantity of ${item.display.name}`}><Plus size={15} aria-hidden /></button>
                    </div>
                    <button type="button" onClick={() => cart.remove(item.key)} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted hover:text-danger" aria-label={`Remove ${item.display.name} from cart`}>
                      <Trash2 size={15} aria-hidden /> Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-6"><Link href="/shop" className="link-underline text-sm text-forest">← Continue shopping</Link></p>
      </section>

      <aside className="h-fit border border-line bg-white p-7 lg:sticky lg:top-28" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-3xl">Order summary</h2>
        <span className="rule-gold my-5" aria-hidden />

        <form
          className="mb-6"
          onSubmit={(e) => { e.preventDefault(); cart.setCouponCode(coupon.trim()); }}
        >
          <label className="field">
            <span className="label">Coupon code</span>
            <span className="flex gap-2">
              <input className="input uppercase" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={cart.couponCode || "Enter code"} maxLength={40} autoComplete="off" aria-describedby="coupon-msg" />
              <button type="submit" className="btn btn-outline btn-sm !min-h-[46px]" disabled={!coupon.trim()}>Apply</button>
            </span>
          </label>
          <p id="coupon-msg" role="status" aria-live="polite" className="mt-2 min-h-5 text-xs">
            {cart.couponCode && quote?.coupon && <span className="text-success">“{quote.coupon.code}” applied. You save {formatINR(quote.coupon.discountPaise)}.</span>}
            {cart.couponCode && quote?.couponError && <span className="text-danger">{quote.couponError}</span>}
            {cart.couponCode && (
              <button type="button" className="ml-2 underline" onClick={() => { cart.setCouponCode(""); setCoupon(""); }}>Remove</button>
            )}
          </p>
        </form>

        {quote ? <SummaryRows quote={quote} taxEnabled={config?.tax.enabled} taxLabel={config?.tax.label} taxInclusive={config?.tax.inclusive} /> : <p className="text-sm text-muted">Calculating…</p>}
        {config && config.freeDeliveryThresholdPaise != null && (
          <p className="mt-3 text-xs text-muted">Free delivery on orders of {formatINR(config.freeDeliveryThresholdPaise)} or more.</p>
        )}
        <p className="mt-3 text-xs text-muted">Delivery is estimated here and confirmed at checkout once you enter your postal code.</p>

        <div className="mt-6 space-y-3">
          {canCheckout ? (
            <Link href="/checkout" className="btn btn-primary btn-lg btn-block" data-testid="checkout-link">Proceed to checkout</Link>
          ) : (
            <button type="button" className="btn btn-primary btn-lg btn-block" disabled>Proceed to checkout</button>
          )}
          <button type="button" onClick={enquire} disabled={pending || !quote || quote.lines.length === 0} className="btn btn-outline btn-block">
            <WhatsAppIcon width={18} height={18} /> Send as WhatsApp enquiry
          </button>
          <p className="text-center text-xs text-muted">A WhatsApp message is an enquiry, not a confirmed order.</p>
        </div>
      </aside>
    </div>
  );
}
