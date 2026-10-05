"use client";

import { useEffect, useMemo, useState } from "react";
import { quoteCart, type QuoteView } from "@/actions/checkout";
import type { CartLine } from "@/types";

/** Fetches server-calculated totals (delivery, coupon, stock checks) for the current cart. */
export function useQuote(lines: CartLine[], couponCode: string) {
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const key = useMemo(() => lines.map((l) => `${l.productId}:${l.quantity}`).join("|") + `#${couponCode}`, [lines, couponCode]);

  useEffect(() => {
    if (lines.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await quoteCart(
          lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          couponCode || undefined,
        );
        if (cancelled) return;
        if (res.ok && res.data) {
          setQuote(res.data);
          setError(null);
        } else if (!res.ok) {
          setQuote(null);
          setError(res.error);
        }
      } catch {
        if (!cancelled) setError("We couldn't refresh your totals. Check your connection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quote: lines.length ? quote : null, error: lines.length ? error : null, loading };
}
