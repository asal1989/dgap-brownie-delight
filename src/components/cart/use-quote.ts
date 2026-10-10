"use client";

import { useEffect, useMemo, useState } from "react";
import { quoteCartAction, type StoreConfig } from "@/actions/cart";
import type { Quote } from "@/lib/quote";
import { useCart } from "./cart-provider";

type Result = { key: string; quote: Quote | null; config: StoreConfig | null; error: string | null };
type State = { quote: Quote | null; config: StoreConfig | null; error: string | null; loading: boolean };

/** Server-authoritative pricing for the current cart. Re-fetches (debounced) whenever the cart or options change. */
export function useQuote(opts: { deliveryOptionId?: string; postalCode?: string } = {}): State {
  const cart = useCart();
  const { deliveryOptionId, postalCode } = opts;
  const [result, setResult] = useState<Result | null>(null);

  // Identity of the request. Loading is simply "the latest result is for a different request".
  const key = useMemo(
    () => JSON.stringify([cart.items.map((i) => [i.key, i.quantity]), cart.couponCode, deliveryOptionId ?? "", postalCode ?? ""]),
    [cart.items, cart.couponCode, deliveryOptionId, postalCode],
  );

  useEffect(() => {
    if (!cart.ready) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await quoteCartAction(cart.items.length ? cart.toInput() : { items: [] }, { deliveryOptionId, postalCode });
      if (!cancelled) setResult(r.ok ? { key, quote: r.quote, config: r.config, error: null } : { key, quote: null, config: null, error: r.error });
    }, cart.items.length ? 220 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // `key` captures every real input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready, key]);

  const loading = !cart.ready || result?.key !== key;
  // Keep showing the previous quote while a new one loads, so the UI does not flash.
  return { quote: result?.quote ?? null, config: result?.config ?? null, error: result?.error ?? null, loading };
}
