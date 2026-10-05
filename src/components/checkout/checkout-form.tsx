"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Script from "next/script";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { OrderSummary } from "@/components/cart/order-summary";
import { CouponField } from "@/components/cart/coupon-field";
import { SmartImage } from "@/components/ui/smart-image";
import { useCart } from "@/hooks/use-cart";
import { useQuote } from "@/hooks/use-quote";
import { toast } from "@/hooks/toast-store";
import { abandonPayment, placeOrder } from "@/actions/checkout";
import { checkoutSchema, type CheckoutData, type CheckoutInput } from "@/lib/validation/checkout";
import { cn, formatINR } from "@/lib/utils";

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: () => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

export interface CheckoutProps {
  methods: { id: "COD" | "RAZORPAY" | "UPI"; label: string; description: string }[];
  prefill: { name: string; email: string };
  deliveryAreas: string;
  sameDay: boolean;
  expectedDelivery: string;
  brandName: string;
}

const inputCls = "h-12 w-full rounded-xl border bg-panel px-4 text-base outline-none transition focus:border-gold focus:ring-2 focus:ring-caramel/20";

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-heading">{label}</label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-fg/70">{hint}</p> : null}
      {error ? <p id={`${id}-err`} className="mt-1 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

export function CheckoutForm({ methods, prefill, deliveryAreas, sameDay, expectedDelivery, brandName }: CheckoutProps) {
  const router = useRouter();
  const { lines, subtotal, hydrated, actions } = useCart();
  const [coupon, setCoupon] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { quote, error: quoteError, loading } = useQuote(lines, coupon);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CheckoutInput, unknown, CheckoutData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: prefill.name,
      mobile: "",
      email: prefill.email,
      address: "",
      area: "",
      city: "",
      state: "",
      pincode: "",
      deliveryInstructions: "",
      notes: "",
      paymentMethod: methods[0]?.id ?? "COD",
      couponCode: "",
    },
  });

  if (!hydrated) return <div className="skeleton h-96" aria-busy aria-label="Loading checkout" />;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h2 className="font-display text-3xl text-heading">Your brownie box is feeling lonely.</h2>
        <p className="mt-2 text-fg/70">Add something delicious before checking out.</p>
        <ButtonLink href="/shop" size="lg" className="mt-8">Explore brownies</ButtonLink>
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <p className="rounded-md bg-danger/10 p-6 text-danger" role="alert">
        Online ordering isn&apos;t available right now because no payment method is enabled. Please contact us to place your order.
      </p>
    );
  }

  const finish = (publicId: string) => {
    actions.clear();
    router.push(`/order-success?o=${encodeURIComponent(publicId)}`);
  };

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await placeOrder(
        { ...data, couponCode: quote?.couponCode ?? "" },
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      );
      if (!res.ok) {
        setFormError(res.error);
        for (const [k, msg] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof CheckoutInput, { message: msg });
        setSubmitting(false);
        return;
      }
      const { intent, publicId } = res.data!;
      if (intent.kind === "none") return finish(publicId);

      if (!window.Razorpay) {
        await abandonPayment(publicId);
        setFormError("The payment window couldn't load. Please check your connection and try again.");
        setSubmitting(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: intent.keyId,
        amount: intent.amountPaise,
        currency: intent.currency,
        order_id: intent.razorpayOrderId,
        name: brandName,
        prefill: { name: data.fullName, email: data.email, contact: data.mobile },
        theme: { color: "#2b160f" },
        handler: async (r: RazorpayHandlerResponse) => {
          try {
            const v = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId, ...r }),
            });
            if (!v.ok) throw new Error("verify failed");
            finish(publicId);
          } catch {
            setFormError("We couldn't confirm your payment. If money was deducted, please contact us with your order number.");
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: async () => {
            await abandonPayment(publicId);
            toast("Payment was cancelled. Your cart is still here.", "info");
            setSubmitting(false);
          },
        },
      });
      rzp.on("payment.failed", () => toast("Payment failed. Please try again.", "error"));
      rzp.open();
    } catch {
      setFormError("Network problem. Please check your connection and try again.");
      setSubmitting(false);
    }
  });

  const e = (k: keyof CheckoutInput) => errors[k]?.message as string | undefined;
  const cls = (k: keyof CheckoutInput) => cn(inputCls, errors[k] ? "border-danger" : "border-line");

  return (
    <>
      {methods.some((m) => m.id === "RAZORPAY") ? <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" /> : null}
      <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_26rem] lg:gap-12">
        <div className="space-y-8">
          {formError ? <p className="rounded-md bg-danger/10 px-5 py-4 text-sm font-semibold text-danger" role="alert">{formError}</p> : null}

          <section className="space-y-4 rounded-lg border border-line bg-panel p-6">
            <h2 className="font-display text-2xl text-heading">Contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="fullName" label="Full name" error={e("fullName")}>
                <input id="fullName" autoComplete="name" className={cls("fullName")} aria-invalid={!!errors.fullName} {...register("fullName")} />
              </Field>
              <Field id="mobile" label="Mobile number" error={e("mobile")}>
                <input id="mobile" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" className={cls("mobile")} aria-invalid={!!errors.mobile} {...register("mobile")} />
              </Field>
            </div>
            <Field id="email" label="Email (optional)" error={e("email")}>
              <input id="email" type="email" autoComplete="email" className={cls("email")} aria-invalid={!!errors.email} {...register("email")} />
            </Field>
          </section>

          <section className="space-y-4 rounded-lg border border-line bg-panel p-6">
            <h2 className="font-display text-2xl text-heading">Delivery address</h2>
            {deliveryAreas ? <p className="rounded-xl bg-panel2/50 px-4 py-3 text-sm text-heading">We deliver to: {deliveryAreas}</p> : null}
            <Field id="address" label="Address" error={e("address")}>
              <input id="address" autoComplete="address-line1" placeholder="House / flat no., street" className={cls("address")} aria-invalid={!!errors.address} {...register("address")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="area" label="Area / locality" error={e("area")}>
                <input id="area" autoComplete="address-line2" className={cls("area")} aria-invalid={!!errors.area} {...register("area")} />
              </Field>
              <Field id="city" label="City" error={e("city")}>
                <input id="city" autoComplete="address-level2" className={cls("city")} aria-invalid={!!errors.city} {...register("city")} />
              </Field>
              <Field id="state" label="State" error={e("state")}>
                <input id="state" autoComplete="address-level1" className={cls("state")} aria-invalid={!!errors.state} {...register("state")} />
              </Field>
              <Field id="pincode" label="Pincode" error={e("pincode")}>
                <input id="pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} className={cls("pincode")} aria-invalid={!!errors.pincode} {...register("pincode")} />
              </Field>
            </div>
            <Field id="deliveryInstructions" label="Delivery instructions (optional)" error={e("deliveryInstructions")} hint={sameDay ? "Same-day delivery may be available. Mention your preferred time." : expectedDelivery || undefined}>
              <textarea id="deliveryInstructions" rows={2} className={cn(cls("deliveryInstructions"), "h-auto py-3")} {...register("deliveryInstructions")} />
            </Field>
            <Field id="notes" label="Order notes (optional)" error={e("notes")}>
              <textarea id="notes" rows={2} className={cn(cls("notes"), "h-auto py-3")} {...register("notes")} />
            </Field>
          </section>

          <fieldset className="space-y-3 rounded-lg border border-line bg-panel p-6">
            <legend className="px-1 font-display text-2xl text-heading">Payment</legend>
            {methods.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-start gap-3 rounded-md border-2 border-line p-4 has-[:checked]:border-choc has-[:checked]:bg-page">
                <input type="radio" value={m.id} className="mt-1 size-4 accent-[var(--gold)]" {...register("paymentMethod")} />
                <span>
                  <span className="block font-semibold text-heading">{m.label}</span>
                  <span className="text-sm text-fg/65">{m.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <aside className="h-fit space-y-5 rounded-lg border border-line bg-panel p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-2xl text-heading">Your order</h2>
          <ul className="max-h-64 space-y-3 overflow-y-auto">
            {lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-panel2">
                  <SmartImage src={l.image} alt="" fill sizes="56px" className="object-cover" />
                  <span className="absolute -right-0 -top-0 grid min-w-5 place-items-center rounded-bl-lg bg-choc px-1 text-[11px] font-bold text-cream">{l.quantity}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{l.name}</span>
                <span className="text-sm font-bold">{formatINR(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <CouponField applied={quote?.couponCode ?? null} message={quote?.couponMessage ?? null} onApply={setCoupon} />
          <OrderSummary quote={quote} fallbackSubtotal={subtotal} loading={loading} />
          {quoteError ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{quoteError}</p> : null}
          <Button type="submit" size="lg" variant="caramel" className="w-full" disabled={submitting || !!quoteError || !quote}>
            {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
            {submitting ? "Placing order…" : quote ? `Place order · ${formatINR(quote.total)}` : "Place order"}
          </Button>
          <p className="text-center text-xs text-fg/70">
            By placing your order you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/refund-policy" className="underline">Refund policy</Link>.
          </p>
        </aside>
      </form>
    </>
  );
}
