"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag, Trash2, X } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { ButtonLink } from "@/components/ui/button";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { WhatsAppCartButton } from "@/components/cart/whatsapp-order";
import { useSiteConfig } from "@/components/providers";
import { useCart } from "@/hooks/use-cart";
import { formatINR } from "@/lib/utils";

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const { lines, open, subtotal, count, actions } = useCart();
  const { freeDeliveryThreshold } = useSiteConfig();
  const panelRef = useRef<HTMLDivElement>(null);
  // Keep the drawer mounted briefly after closing so the exit animation can play.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const closing = mounted && !open;
  useEffect(() => {
    if (open || !mounted) return;
    const t = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.close();
      if (e.key === "Tab" && panelRef.current) {
        const nodes = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, actions]);

  const remaining = freeDeliveryThreshold > 0 ? freeDeliveryThreshold - subtotal : 0;

  if (!mounted) return null;
  return (
    <>
      {
        <div className="fixed inset-0 z-[60]">
          <div
            className={`absolute inset-0 bg-espresso/60 backdrop-blur-[2px] transition-opacity duration-200 ${closing ? "opacity-0" : "animate-fade-in"}`}
            onClick={actions.close}
            aria-hidden
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-page shadow-2xl transition-transform duration-[250ms] ease-out ${closing ? "translate-x-full" : "animate-slide-in"}`}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-2xl text-heading">
                Your cart <span className="text-base text-fg/70">({count})</span>
              </h2>
              <button
                type="button"
                data-autofocus
                onClick={actions.close}
                aria-label="Close cart"
                className="grid size-11 place-items-center rounded-full hover:bg-panel2/70"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <ShoppingBag className="size-12 text-caramel" aria-hidden />
                <p className="font-display text-2xl text-heading">Your brownie box is feeling lonely.</p>
                <p className="text-fg/70">Let&apos;s fix that.</p>
                <ButtonLink href="/shop" onClick={actions.close}>
                  Explore brownies
                </ButtonLink>
              </div>
            ) : (
              <>
                {remaining > 0 ? (
                  <p className="bg-panel2/50 px-5 py-2.5 text-center text-sm font-medium text-heading" role="status">
                    You&apos;re {formatINR(remaining)} away from free delivery
                  </p>
                ) : freeDeliveryThreshold > 0 ? (
                  <p className="bg-success/10 px-5 py-2.5 text-center text-sm font-semibold text-success" role="status">
                    You&apos;ve unlocked free delivery
                  </p>
                ) : null}
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {lines.map((l) => (
                    <li key={l.productId} className="flex gap-4 py-4">
                      <Link href={`/shop/${l.slug}`} onClick={actions.close} className="relative size-20 shrink-0 overflow-hidden rounded-md bg-panel2">
                        <SmartImage src={l.image} alt={l.name} fill sizes="80px" className="object-cover" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/shop/${l.slug}`} onClick={actions.close} className="font-semibold leading-snug text-heading hover:underline">
                            {l.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => actions.remove(l.productId)}
                            aria-label={`Remove ${l.name} from cart`}
                            className="grid size-9 shrink-0 place-items-center rounded-full text-fg/70 hover:bg-panel2/70 hover:text-danger"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                        <p className="text-sm text-fg/70">{formatINR(l.price)} each</p>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <QuantityStepper size="sm" value={l.quantity} min={0} label={l.name} onChange={(q) => actions.setQuantity(l.productId, q)} />
                          <span className="font-bold text-heading">{formatINR(l.price * l.quantity)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="space-y-3 border-t border-line bg-panel px-5 py-5">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-bold text-heading">{formatINR(subtotal)}</span>
                  </div>
                  <p className="text-xs text-fg/70">Delivery and discounts are calculated at checkout.</p>
                  <ButtonLink href="/checkout" size="lg" className="w-full" onClick={actions.close}>
                    Proceed to checkout
                  </ButtonLink>
                  <div className="grid grid-cols-2 gap-2">
                    <ButtonLink href="/cart" variant="ghost" size="sm" onClick={actions.close}>
                      View cart
                    </ButtonLink>
                    <WhatsAppCartButton size="sm" label="WhatsApp" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      }
    </>
  );
}
