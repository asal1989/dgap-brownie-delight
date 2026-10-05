"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/actions/reviews";
import { cn } from "@/lib/utils";

const input = "w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-gold";

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4 rounded-lg border border-line bg-panel p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        fd.set("productId", productId);
        fd.set("rating", String(rating));
        start(async () => {
          const res = await submitReview(fd);
          setMsg({ ok: res.ok, text: res.ok ? (res.message ?? "Thank you!") : res.error });
          if (res.ok) {
            form.reset();
            setRating(0);
          }
        });
      }}
    >
      <h3 className="font-display text-xl text-heading">Write a review</h3>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} className="grid size-11 place-items-center rounded-full hover:bg-panel2/60">
              <Star className={cn("size-6", n <= rating ? "fill-gold text-gold" : "text-fg/25")} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="rv-name" className="mb-1 block text-sm font-semibold">Your name</label>
        <input id="rv-name" name="customerName" required minLength={2} maxLength={60} className={input} autoComplete="name" />
      </div>
      <div>
        <label htmlFor="rv-text" className="mb-1 block text-sm font-semibold">Your review</label>
        <textarea id="rv-text" name="review" required minLength={10} maxLength={1000} rows={4} className={input} />
      </div>
      {msg ? (
        <p role="status" className={cn("text-sm font-semibold", msg.ok ? "text-success" : "text-danger")}>
          {msg.text}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Submit review"}</Button>
    </form>
  );
}
