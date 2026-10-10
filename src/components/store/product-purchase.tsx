"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { productEnquiryAction } from "@/actions/cart";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/ui/toast";
import { WhatsAppIcon } from "@/components/ui/icons";
import { formatINR } from "@/lib/money";

export type PurchaseVariant = {
  id: string;
  label: string;
  pricePaise: number | null;
  comparePaise: number | null;
  purchasable: boolean;
  stockNote: string | null;
};

/** Variant selection, quantity and add-to-cart. Prices here are display hints: the server re-prices at checkout. */
export function ProductPurchase({
  slug,
  name,
  image,
  variants,
}: {
  slug: string;
  name: string;
  image: string | null;
  variants: PurchaseVariant[];
}) {
  const firstBuyable = variants.find((v) => v.purchasable) ?? variants[0];
  const [variantId, setVariantId] = useState(firstBuyable?.id ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();
  const cart = useCart();
  const toast = useToast();
  const variant = variants.find((v) => v.id === variantId);

  if (!variant) return <p className="text-muted">This product is not available right now.</p>;

  const buyable = variant.purchasable && variant.pricePaise != null;

  const add = () => {
    if (!buyable || variant.pricePaise == null) return;
    cart.add({ type: "product", variantId: variant.id, quantity: qty, display: { name, variantLabel: variant.label, slug, image, unitPricePaise: variant.pricePaise } }, qty);
    toast.show(`${name} (${variant.label}) added to your cart`, { href: "/cart", hrefLabel: "View cart" });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const enquire = () =>
    startTransition(async () => {
      const r = await productEnquiryAction(slug, variant.label);
      if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
      else toast.show("WhatsApp ordering has not been set up yet. Please use the contact page.", { tone: "error", href: "/contact", hrefLabel: "Contact" });
    });

  return (
    <div>
      <fieldset>
        <legend className="eyebrow mb-3">Choose a size</legend>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Size">
          {variants.map((v) => {
            const selected = v.id === variantId;
            return (
              <label
                key={v.id}
                className={`relative min-w-[8.5rem] cursor-pointer border px-4 py-3 text-left transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-deep ${selected ? "border-forest bg-forest text-ivory" : "border-line bg-white hover:border-forest"} ${v.purchasable ? "" : "opacity-70"}`}
              >
                <input type="radio" name="variant" value={v.id} checked={selected} onChange={() => { setVariantId(v.id); setAdded(false); }} className="sr-only" />
                <span className="block text-sm font-semibold">{v.label}</span>
                <span className={`block text-sm ${selected ? "text-gold" : "text-muted"}`}>
                  {v.pricePaise != null ? formatINR(v.pricePaise) : "Price on request"}
                </span>
                {v.stockNote && <span className={`mt-0.5 block text-xs ${selected ? "text-ivory/80" : "text-muted"}`}>{v.stockNote}</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center gap-4" role="group" aria-label="Quantity">
        <span className="eyebrow">Quantity</span>
        <div className="inline-flex items-center border border-line bg-white">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="grid size-11 place-items-center transition-colors hover:bg-forest hover:text-ivory disabled:opacity-30" aria-label="Decrease quantity">
            <Minus size={16} aria-hidden />
          </button>
          <output className="w-10 text-center font-semibold" aria-live="polite">{qty}</output>
          <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} disabled={qty >= 50} className="grid size-11 place-items-center transition-colors hover:bg-forest hover:text-ivory disabled:opacity-30" aria-label="Increase quantity">
            <Plus size={16} aria-hidden />
          </button>
        </div>
      </div>

      {buyable && variant.pricePaise != null && (
        <p className="mt-5 font-serif text-3xl text-forest" aria-live="polite">
          {formatINR(variant.pricePaise * qty)}
          {variant.comparePaise != null && variant.comparePaise > variant.pricePaise && <s className="ml-3 text-lg text-muted">{formatINR(variant.comparePaise * qty)}</s>}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={add} disabled={!buyable} className="btn btn-primary btn-lg min-w-[13rem] flex-1 sm:flex-none" data-testid="add-to-cart">
          {added ? <Check size={18} aria-hidden /> : <ShoppingBag size={18} aria-hidden />}
          {added ? "Added" : buyable ? "Add to cart" : variant.pricePaise == null ? "Price to be confirmed" : "Sold out"}
        </button>
        <button type="button" onClick={enquire} disabled={pending} className="btn btn-outline btn-lg">
          <WhatsAppIcon aria-hidden /> Enquire on WhatsApp
        </button>
      </div>
      {!buyable && variant.pricePaise == null && (
        <p className="mt-4 text-sm text-muted">This size does not have a confirmed price yet. Message us on WhatsApp and we will help you place an order.</p>
      )}
      {cart.ready && cart.count > 0 && (
        <p className="mt-4 text-sm"><Link href="/cart" className="link-underline text-forest">View your cart ({cart.count})</Link></p>
      )}
    </div>
  );
}
