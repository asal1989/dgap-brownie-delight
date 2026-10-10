import { formatINR } from "@/lib/money";
import type { Quote } from "@/lib/quote";

export function SummaryRows({ quote, taxLabel, taxInclusive, taxEnabled }: { quote: Quote; taxLabel?: string; taxInclusive?: boolean; taxEnabled?: boolean }) {
  const p = quote.pricing;
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(p.subtotalPaise)}</dd></div>
      {p.discountPaise > 0 && (
        <div className="flex justify-between text-success"><dt>Discount{quote.coupon ? ` (${quote.coupon.code})` : ""}</dt><dd>−{formatINR(p.discountPaise)}</dd></div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted">Delivery{quote.delivery ? ` · ${quote.delivery.label}` : ""}</dt>
        <dd>{p.freeDeliveryApplied ? "Free" : formatINR(p.shippingPaise)}</dd>
      </div>
      {taxEnabled && p.taxPaise > 0 && (
        <div className="flex justify-between"><dt className="text-muted">{taxLabel ?? "Tax"}{taxInclusive ? " (included)" : ""}</dt><dd>{formatINR(p.taxPaise)}</dd></div>
      )}
      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <dt className="font-semibold">Total</dt>
        <dd className="font-serif text-3xl text-forest" data-testid="order-total">{formatINR(p.totalPaise)}</dd>
      </div>
    </dl>
  );
}
