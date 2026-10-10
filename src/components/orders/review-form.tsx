"use client";

import { useActionState } from "react";
import { submitReview } from "@/actions/reviews";
import type { FormState } from "@/actions/newsletter";

export function ReviewForm({ orderNumber, productId, productName }: { orderNumber: string; productId: string; productName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReview, null);
  if (state?.ok) return <p role="status" className="text-sm text-success">{state.message}</p>;
  return (
    <form action={action} className="space-y-3 border border-line bg-white p-5" aria-label={`Review ${productName}`}>
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="productId" value={productId} />
      <p className="font-semibold text-forest">Review {productName}</p>
      <label className="field"><span className="label">Rating</span>
        <select name="rating" className="select" defaultValue="" required>
          <option value="" disabled>Choose…</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
        </select>
      </label>
      <label className="field"><span className="label">Headline <span className="font-normal text-muted">(optional)</span></span><input name="title" className="input" maxLength={80} /></label>
      <label className="field"><span className="label">Your review</span><textarea name="body" className="textarea" rows={3} required minLength={10} maxLength={1000} /></label>
      <p role="alert" className="min-h-5 text-sm text-danger">{state && !state.ok ? state.message : null}</p>
      <button type="submit" disabled={pending} className="btn btn-outline btn-sm">{pending ? "Sending…" : "Submit review"}</button>
    </form>
  );
}
