"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { devPayAction, startPaymentAction, verifyPaymentAction } from "@/actions/checkout";

type RazorpayHandlerResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.append(s);
  });
}

/** Completes (or retries) payment for an unpaid online order. */
export function PayPanel({ orderNumber, totalLabel, mode, retry }: { orderNumber: string; totalLabel: string; mode: "razorpay" | "dev" | "off"; retry: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function payWithRazorpay() {
    setBusy(true);
    setMessage(null);
    const started = await startPaymentAction(orderNumber);
    if (!started.ok || started.payment.mode !== "razorpay") {
      setBusy(false);
      return setMessage(started.ok ? "Online payment is not available right now." : started.error);
    }
    if (!(await loadRazorpayScript()) || !window.Razorpay) {
      setBusy(false);
      return setMessage("Could not load the payment window. Check your connection and try again.");
    }
    const p = started.payment;
    const rz = new window.Razorpay({
      key: p.keyId,
      order_id: p.razorpayOrderId,
      amount: p.amountPaise,
      currency: "INR",
      name: "DGAP Brownie Delight",
      description: `Order ${orderNumber}`,
      prefill: { name: started.customer.name, email: started.customer.email ?? undefined, contact: started.customer.phone },
      theme: { color: "#183A2C" },
      handler: async (resp: RazorpayHandlerResponse) => {
        const v = await verifyPaymentAction(orderNumber, resp);
        setBusy(false);
        if (v.ok && v.status === "paid") router.refresh();
        else if (v.ok) { setMessage("Your payment is being confirmed. This page will update shortly."); setTimeout(() => router.refresh(), 4000); }
        else setMessage(v.error ?? "We could not confirm your payment.");
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rz.on("payment.failed", (r) => { setBusy(false); setMessage(r.error?.description ?? "The payment failed. You can try again."); router.refresh(); });
    rz.open();
  }

  async function simulate(outcome: "success" | "failure") {
    setBusy(true);
    setMessage(null);
    const started = await startPaymentAction(orderNumber);
    if (!started.ok) { setBusy(false); return setMessage(started.error); }
    const r = await devPayAction(orderNumber, outcome);
    setBusy(false);
    if (!r.ok) return setMessage(r.error ?? "Simulation failed.");
    router.refresh();
  }

  if (mode === "off") {
    return <p className="border-l-[3px] border-danger bg-white px-4 py-3 text-sm text-danger">Online payment is not available right now. Please contact us to complete this order.</p>;
  }

  return (
    <section className="border border-gold bg-white p-7" aria-labelledby="pay-title">
      <h2 id="pay-title" className="text-3xl">{retry ? "Payment didn’t go through" : "Complete your payment"}</h2>
      <p className="mt-2 text-muted">{retry ? "No money was taken. You can try again." : "Your order is reserved while you pay."} Amount due: <strong className="text-forest">{totalLabel}</strong></p>

      {mode === "razorpay" ? (
        <button type="button" onClick={payWithRazorpay} disabled={busy} className="btn btn-primary btn-lg mt-6" data-testid="pay-now">{busy ? "Opening payment…" : `Pay ${totalLabel}`}</button>
      ) : (
        <div className="mt-6 border border-dashed border-gold-deep bg-ivory p-5" data-testid="dev-payment">
          <p className="eyebrow mb-2">Development payment mode</p>
          <p className="text-sm text-muted">This is a simulated payment for testing. No real money is charged and the order is flagged as test data.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => simulate("success")} disabled={busy} className="btn btn-primary" data-testid="dev-pay-success">Simulate successful payment</button>
            <button type="button" onClick={() => simulate("failure")} disabled={busy} className="btn btn-outline" data-testid="dev-pay-failure">Simulate failed payment</button>
          </div>
        </div>
      )}
      <p role="alert" aria-live="assertive" className="mt-4 min-h-5 text-sm text-danger">{message}</p>
    </section>
  );
}
