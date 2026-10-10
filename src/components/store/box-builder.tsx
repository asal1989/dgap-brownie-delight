"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, X } from "lucide-react";
import { boxEnquiryAction } from "@/actions/cart";
import { useCart } from "@/components/cart/cart-provider";
import { WhatsAppIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { formatINR } from "@/lib/money";

type Size = { variantId: string; productName: string; productSlug: string; image: string | null; label: string; pieces: number; pricePaise: number | null; purchasable: boolean };
type Pick = { productId: string; name: string; shortDescription: string; image: string | null; imageAlt: string };

/** Choose a box size, fill it with flavours, see an itemised summary and add it to the cart. The server re-validates everything. */
export function BoxBuilder({ sizes, picks }: { sizes: Size[]; picks: Pick[] }) {
  const cart = useCart();
  const toast = useToast();
  const [sizeId, setSizeId] = useState(sizes.find((s) => s.purchasable)?.variantId ?? sizes[0]?.variantId ?? "");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const size = sizes.find((s) => s.variantId === sizeId);
  const chosen = useMemo(() => picks.filter((p) => (qty[p.productId] ?? 0) > 0), [picks, qty]);
  const total = chosen.reduce((n, p) => n + (qty[p.productId] ?? 0), 0);

  if (!size || picks.length === 0) {
    return <p className="text-center text-muted">The box builder is not available right now. Please check back soon.</p>;
  }
  const remaining = size.pieces - total;
  const full = remaining === 0;

  const changeSize = (s: Size) => {
    setSizeId(s.variantId);
    setNote(null);
    // Trim surplus brownies when switching to a smaller box.
    setQty((prev) => {
      let extra = Object.values(prev).reduce((a, b) => a + b, 0) - s.pieces;
      if (extra <= 0) return prev;
      const next = { ...prev };
      for (const p of [...picks].reverse()) while (extra > 0 && (next[p.productId] ?? 0) > 0) { next[p.productId]--; extra--; }
      return next;
    });
  };
  const step = (id: string, d: number) => {
    setNote(null);
    setQty((prev) => {
      const cur = prev[id] ?? 0;
      if (d > 0 && total >= size.pieces) { setNote(`Your ${size.label.toLowerCase()} is full. Remove a brownie to add another.`); return prev; }
      return { ...prev, [id]: Math.max(0, cur + d) };
    });
  };

  const selections = chosen.map((p) => ({ productId: p.productId, quantity: qty[p.productId]! }));

  const addToCart = () => {
    if (!full) return setNote(`Please choose ${remaining} more brownie${remaining === 1 ? "" : "s"} to fill your box.`);
    if (!size.purchasable || size.pricePaise == null) return setNote("This box size does not have a confirmed price yet. Send us an enquiry on WhatsApp.");
    cart.add(
      { type: "box", variantId: size.variantId, quantity: 1, selections, display: { name: "Custom brownie box", variantLabel: `${size.label} (${size.pieces} brownies)`, slug: size.productSlug, image: size.image, unitPricePaise: size.pricePaise, selectionNames: chosen.map((p) => `${qty[p.productId]} × ${p.name}`) } },
      1,
    );
    toast.show("Your custom box was added to the cart", { href: "/cart", hrefLabel: "View cart" });
    setQty({});
  };

  const enquire = () =>
    startTransition(async () => {
      if (total === 0) return setNote("Choose your brownies first, then send the enquiry.");
      const r = await boxEnquiryAction(size.variantId, selections);
      if (!r.ok) return setNote(r.error);
      if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
      else toast.show("WhatsApp ordering has not been set up yet. Please use the contact page.", { tone: "error", href: "/contact", hrefLabel: "Contact" });
    });

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:gap-16">
      <div>
        <fieldset>
          <legend className="mb-4 font-serif text-3xl text-forest"><span className="text-gold-deep">1.</span> Choose your box size</legend>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Box size">
            {sizes.map((s) => {
              const sel = s.variantId === sizeId;
              return (
                <label key={s.variantId} className={`min-w-[9rem] cursor-pointer border px-5 py-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-deep ${sel ? "border-forest bg-forest text-ivory" : "border-line bg-white hover:border-forest"}`}>
                  <input type="radio" name="box-size" value={s.variantId} checked={sel} onChange={() => changeSize(s)} className="sr-only" />
                  <span className="block font-semibold">{s.label}</span>
                  <span className={`block text-sm ${sel ? "text-gold" : "text-muted"}`}>{s.pricePaise != null ? formatINR(s.pricePaise) : `${s.pieces} brownies`}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-12">
          <legend className="mb-4 font-serif text-3xl text-forest"><span className="text-gold-deep">2.</span> Pick your flavours</legend>
          <div className="mb-5" aria-live="polite">
            <div className="h-1 bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={size.pieces} aria-valuenow={total} aria-label="Box fill"><div className="h-full bg-gold transition-[width] duration-300" style={{ width: `${(total / size.pieces) * 100}%` }} /></div>
            <p className="mt-2 text-sm font-medium text-forest" data-testid="box-progress">{full ? `Your box is full: ${size.pieces} of ${size.pieces}.` : `${total} of ${size.pieces} chosen. ${remaining} to go.`}</p>
          </div>
          <ul className="space-y-3">
            {picks.map((p) => {
              const n = qty[p.productId] ?? 0;
              return (
                <li key={p.productId} className="flex items-center gap-4 border border-line bg-white p-3">
                  <span className="relative block size-16 shrink-0 overflow-hidden bg-ivory-deep">{p.image && <Image src={p.image} alt={p.imageAlt} fill sizes="64px" className="object-cover" />}</span>
                  <div className="min-w-0 flex-1"><p className="font-semibold text-forest">{p.name}</p><p className="hidden text-sm text-muted sm:block">{p.shortDescription}</p></div>
                  <div className="inline-flex items-center border border-line" role="group" aria-label={`Quantity of ${p.name}`}>
                    <button type="button" onClick={() => step(p.productId, -1)} disabled={n === 0} className="grid size-10 place-items-center hover:bg-forest hover:text-ivory disabled:opacity-30" aria-label={`Remove one ${p.name}`}><Minus size={15} aria-hidden /></button>
                    <output className="w-8 text-center font-semibold" aria-live="polite">{n}</output>
                    <button type="button" onClick={() => step(p.productId, 1)} disabled={full} className="grid size-10 place-items-center hover:bg-forest hover:text-ivory disabled:opacity-30" aria-label={`Add one ${p.name}`} data-testid={`box-add-${p.productId}`}><Plus size={15} aria-hidden /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>

      <aside className="h-fit border border-line bg-white p-7 lg:sticky lg:top-28" aria-labelledby="box-summary">
        <h2 id="box-summary" className="text-3xl">Your box</h2>
        <span className="rule-gold my-5" aria-hidden />
        {chosen.length === 0 ? <p className="text-sm text-muted">Nothing chosen yet. Use the + buttons to add brownies.</p> : (
          <ul className="space-y-2 text-sm" aria-label="Selected brownies">
            {chosen.map((p) => (
              <li key={p.productId} className="flex items-center justify-between gap-2">
                <span>{qty[p.productId]} × {p.name}</span>
                <button type="button" onClick={() => setQty((q) => ({ ...q, [p.productId]: 0 }))} className="text-muted hover:text-danger" aria-label={`Remove ${p.name} from box`}><X size={15} aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-sm text-muted">{size.label}</span>
          <span className="font-serif text-3xl text-forest" data-testid="box-price">{size.pricePaise != null ? formatINR(size.pricePaise) : "Price on request"}</span>
        </div>
        <p role="alert" aria-live="assertive" className="mt-3 min-h-5 text-sm text-danger">{note}</p>
        <div className="mt-4 space-y-3">
          <button type="button" onClick={addToCart} disabled={!size.purchasable} className="btn btn-primary btn-lg btn-block" data-testid="box-add-to-cart">Add box to cart</button>
          <button type="button" onClick={enquire} disabled={pending} className="btn btn-outline btn-block"><WhatsAppIcon width={18} height={18} /> Enquire on WhatsApp</button>
        </div>
        {!size.purchasable && <p className="mt-4 text-xs text-muted">This box size does not have a confirmed price yet. Send us your selection on WhatsApp and we will confirm the price.</p>}
        {cart.ready && cart.count > 0 && <p className="mt-4 text-center text-sm"><Link href="/cart" className="link-underline text-forest">View cart ({cart.count})</Link></p>}
      </aside>
    </div>
  );
}
