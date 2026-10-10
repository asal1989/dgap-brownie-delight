"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { newKey } from "@/lib/client-id";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { placeOrderAction } from "@/actions/checkout";
import { useCart } from "@/components/cart/cart-provider";
import { SummaryRows } from "@/components/cart/order-summary";
import { useQuote } from "@/components/cart/use-quote";
import { EmptyState } from "@/components/ui/section";
import { checkoutSchema, type CheckoutFormValues, type CheckoutInput } from "@/lib/checkout-schema";
import { formatINR } from "@/lib/money";


type Props = { user: { name: string; email: string; phone: string | null } | null };

function Field({ label, error, children, optional }: { label: string; error?: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="field">
      <span className="label">{label}{optional && <span className="font-normal text-muted"> (optional)</span>}</span>
      {children}
      {error && <span role="alert" className="field-error block">{error}</span>}
    </label>
  );
}

export function CheckoutForm({ user }: Props) {
  const cart = useCart();
  const router = useRouter();
  const [idempotencyKey] = useState(() => newKey());
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CheckoutFormValues, unknown, CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: {
      customerName: user?.name ?? "",
      customerEmail: user?.email ?? "",
      customerPhone: user?.phone ?? "",
      recipientName: "",
      recipientPhone: "",
      line1: "",
      line2: "",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "",
      deliveryNote: "",
      giftMessage: "",
      deliveryOptionId: "",
      paymentMethod: "ONLINE",
      idempotencyKey,
    },
  });
  const { register, handleSubmit, control, setValue, setError, formState: { errors } } = form;

  const postal = useWatch({ control, name: "postalCode" }) ?? "";
  const deliveryOptionId = useWatch({ control, name: "deliveryOptionId" });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const postalValid = /^[1-9]\d{5}$/.test(postal.trim());
  const { quote, config, loading } = useQuote({ deliveryOptionId: deliveryOptionId || undefined, postalCode: postalValid ? postal.trim() : undefined });

  // Default to the first available delivery option once the configuration has loaded.
  useEffect(() => {
    if (config && !deliveryOptionId && config.deliveryOptions[0]) setValue("deliveryOptionId", config.deliveryOptions[0].id);
  }, [config, deliveryOptionId, setValue]);
  // Default payment method to something that is actually available.
  useEffect(() => {
    if (!config) return;
    if (paymentMethod === "ONLINE" && !config.onlinePaymentAvailable && config.codEnabled) setValue("paymentMethod", "COD");
  }, [config, paymentMethod, setValue]);

  if (!cart.ready) return <div className="container-x py-24 text-center text-muted" aria-busy="true">Loading…</div>;
  if (cart.items.length === 0) {
    return (
      <div className="container-x py-24">
        <EmptyState title="Your cart is empty" action={{ href: "/shop", label: "Browse brownies" }}>Add something delicious before checking out.</EmptyState>
      </div>
    );
  }

  const closed = config && !config.orderingEnabled;
  const noPayment = config && !config.onlinePaymentAvailable && !config.codEnabled;

  const onSubmit = async (values: CheckoutInput) => {
    setServerError(null);
    setSubmitting(true);
    const r = await placeOrderAction(cart.toInput(), values);
    if (r.ok) {
      cart.clear();
      router.push(`/order-success/${r.orderNumber}`);
      return;
    }
    setSubmitting(false);
    if (r.fieldErrors) {
      for (const [k, message] of Object.entries(r.fieldErrors)) setError(k as FieldPath<CheckoutFormValues>, { message });
    }
    setServerError(r.error);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const err = (n: FieldPath<CheckoutFormValues>) => errors[n]?.message as string | undefined;

  return (
    <div className="container-x py-12">
      <h1 className="text-5xl">Checkout</h1>
      <span className="rule-gold my-6" aria-hidden />

      {closed && <p role="status" className="mb-6 border-l-[3px] border-gold bg-white px-4 py-3 text-sm">{config.closedMessage}</p>}
      {serverError && <p role="alert" className="mb-6 border-l-[3px] border-danger bg-white px-4 py-3 text-sm text-danger" data-testid="checkout-error">{serverError}</p>}
      {quote?.issues.map((i) => <p key={i} role="alert" className="mb-3 border-l-[3px] border-danger bg-white px-4 py-3 text-sm text-danger">{i} <Link href="/cart" className="underline">Review cart</Link></p>)}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:gap-16" aria-label="Checkout">
        <input type="hidden" {...register("idempotencyKey")} />
        <div className="space-y-12">
          <fieldset className="space-y-5">
            <legend className="mb-2 font-serif text-3xl text-forest">Your details</legend>
            <Field label="Full name" error={err("customerName")}><input className="input" autoComplete="name" aria-invalid={!!errors.customerName} {...register("customerName")} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Phone (WhatsApp preferred)" error={err("customerPhone")}><input className="input" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.customerPhone} {...register("customerPhone")} /></Field>
              <Field label="Email" optional error={err("customerEmail")}><input className="input" type="email" autoComplete="email" aria-invalid={!!errors.customerEmail} {...register("customerEmail")} /></Field>
            </div>
            {!user && <p className="text-sm text-muted">Checking out as a guest. <Link href="/account/login?next=/checkout" className="link-underline text-forest">Sign in</Link> to save your order history.</p>}
          </fieldset>

          <fieldset className="space-y-5">
            <legend className="mb-2 font-serif text-3xl text-forest">Delivery address</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Recipient name" optional error={err("recipientName")}><input className="input" autoComplete="shipping name" {...register("recipientName")} /></Field>
              <Field label="Recipient phone" optional error={err("recipientPhone")}><input className="input" type="tel" inputMode="tel" {...register("recipientPhone")} /></Field>
            </div>
            <Field label="Address line 1" error={err("line1")}><input className="input" autoComplete="shipping address-line1" aria-invalid={!!errors.line1} {...register("line1")} /></Field>
            <Field label="Address line 2" optional error={err("line2")}><input className="input" autoComplete="shipping address-line2" {...register("line2")} /></Field>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="City" error={err("city")}><input className="input" autoComplete="shipping address-level2" aria-invalid={!!errors.city} {...register("city")} /></Field>
              <Field label="State" optional error={err("state")}><input className="input" autoComplete="shipping address-level1" {...register("state")} /></Field>
              <Field label="Postal code" error={err("postalCode")}><input className="input" inputMode="numeric" maxLength={6} autoComplete="shipping postal-code" aria-invalid={!!errors.postalCode} {...register("postalCode")} /></Field>
            </div>
            <Field label="Delivery instructions" optional error={err("deliveryNote")}><textarea className="textarea" rows={2} placeholder="Landmark, gate code, preferred time…" {...register("deliveryNote")} /></Field>
            <Field label="Gift message" optional error={err("giftMessage")}><textarea className="textarea" rows={2} maxLength={300} placeholder="A short note to include with the brownies" {...register("giftMessage")} /></Field>
          </fieldset>

          <fieldset>
            <legend className="mb-4 font-serif text-3xl text-forest">Delivery option</legend>
            {config?.deliveryOptions.length ? (
              <div className="space-y-3" role="radiogroup">
                {config.deliveryOptions.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-start gap-3 border border-line bg-white p-4 has-[:checked]:border-forest has-[:checked]:bg-forest/[0.03]">
                    <input type="radio" value={o.id} className="mt-1 accent-forest" {...register("deliveryOptionId")} />
                    <span className="flex-1"><span className="font-semibold">{o.label}</span>{o.description && <span className="block text-sm text-muted">{o.description}</span>}</span>
                    <span className="text-sm font-semibold">{formatINR(o.feePaise)}</span>
                  </label>
                ))}
              </div>
            ) : <p className="text-sm text-muted">Loading delivery options…</p>}
            {err("deliveryOptionId") && <p role="alert" className="field-error">{err("deliveryOptionId")}</p>}
            {quote?.deliveryError && <p role="alert" className="field-error mt-2">{quote.deliveryError}</p>}
          </fieldset>

          <fieldset>
            <legend className="mb-4 font-serif text-3xl text-forest">Payment</legend>
            <div className="space-y-3" role="radiogroup">
              {config?.onlinePaymentAvailable && (
                <label className="flex cursor-pointer items-start gap-3 border border-line bg-white p-4 has-[:checked]:border-forest has-[:checked]:bg-forest/[0.03]">
                  <input type="radio" value="ONLINE" className="mt-1 accent-forest" {...register("paymentMethod")} />
                  <span><span className="font-semibold">Pay online</span><span className="block text-sm text-muted">{config.devPayment ? "Development mode: a simulated payment, no real money moves." : "UPI, cards and net banking, securely through Razorpay."}</span></span>
                </label>
              )}
              {config?.codEnabled && (
                <label className="flex cursor-pointer items-start gap-3 border border-line bg-white p-4 has-[:checked]:border-forest has-[:checked]:bg-forest/[0.03]">
                  <input type="radio" value="COD" className="mt-1 accent-forest" {...register("paymentMethod")} />
                  <span><span className="font-semibold">Cash on delivery</span><span className="block text-sm text-muted">Pay when your brownies arrive.</span></span>
                </label>
              )}
              {noPayment && <p className="text-sm text-danger">No payment method is available right now. Please contact us on WhatsApp to order.</p>}
            </div>
          </fieldset>
        </div>

        <aside className="h-fit border border-line bg-white p-7 lg:sticky lg:top-28" aria-labelledby="co-summary">
          <h2 id="co-summary" className="text-3xl">Order summary</h2>
          <span className="rule-gold my-5" aria-hidden />
          <ul className="mb-5 space-y-3 text-sm" aria-label="Items">
            {(quote?.lines ?? []).map((l) => (
              <li key={l.key} className="flex justify-between gap-3">
                <span>{l.productName} <span className="text-muted">({l.variantLabel}) × {l.quantity}</span></span>
                <span className="shrink-0">{formatINR(l.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>
          {quote ? <SummaryRows quote={quote} taxEnabled={config?.tax.enabled} taxLabel={config?.tax.label} taxInclusive={config?.tax.inclusive} /> : <p className="text-sm text-muted">Calculating…</p>}
          {cart.couponCode && quote?.couponError && <p className="mt-3 text-xs text-danger">{quote.couponError} <Link href="/cart" className="underline">Change coupon</Link></p>}
          <button type="submit" disabled={submitting || loading || !quote?.valid || closed || noPayment || (paymentMethod === "ONLINE" && !config?.onlinePaymentAvailable)} className="btn btn-primary btn-lg btn-block mt-6" data-testid="place-order">
            {submitting ? "Placing order…" : paymentMethod === "COD" ? "Place order" : "Place order & pay"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">Totals are verified on our server when you place the order.</p>
        </aside>
      </form>
    </div>
  );
}
