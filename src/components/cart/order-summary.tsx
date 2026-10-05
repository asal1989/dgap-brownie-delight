import { formatINR } from "@/lib/utils";
import type { QuoteView } from "@/actions/checkout";

export function OrderSummary({ quote, fallbackSubtotal, loading }: { quote: QuoteView | null; fallbackSubtotal: number; loading?: boolean }) {
  const row = "flex items-center justify-between text-sm";
  return (
    <dl className="space-y-3" aria-busy={loading}>
      <div className={row}>
        <dt className="text-ink/70">Subtotal</dt>
        <dd className="font-semibold">{formatINR(quote?.subtotal ?? fallbackSubtotal)}</dd>
      </div>
      {quote && quote.discount > 0 ? (
        <div className={row}>
          <dt className="text-success">Discount{quote.couponCode ? ` (${quote.couponCode})` : ""}</dt>
          <dd className="font-semibold text-success">−{formatINR(quote.discount)}</dd>
        </div>
      ) : null}
      <div className={row}>
        <dt className="text-ink/70">Delivery</dt>
        <dd className="font-semibold">{quote ? (quote.deliveryFee === 0 ? "Free" : formatINR(quote.deliveryFee)) : "—"}</dd>
      </div>
      <div className="flex items-center justify-between border-t border-beige pt-3 text-lg">
        <dt className="font-bold text-choc">Total</dt>
        <dd className="font-bold text-choc">{quote ? formatINR(quote.total) : formatINR(fallbackSubtotal)}</dd>
      </div>
    </dl>
  );
}
