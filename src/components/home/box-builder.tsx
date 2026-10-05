"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/hooks/toast-store";
import { cn, formatINR } from "@/lib/utils";
import type { BoxProduct } from "@/types";

const SIZES = [4, 6, 9, 12] as const;
const STEPS = ["Box size", "Flavours", "Review", "Add to cart"] as const;

export function BoxBuilder({ products }: { products: BoxProduct[] }) {
  const { actions } = useCart();
  const [size, setSize] = useState<number>(6);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [step, setStep] = useState(0);

  const chosen = useMemo(() => products.filter((p) => (picks[p.id] ?? 0) > 0), [products, picks]);
  const filled = chosen.reduce((n, p) => n + (picks[p.id] ?? 0), 0);
  const total = chosen.reduce((n, p) => n + p.price * (picks[p.id] ?? 0), 0);
  const remaining = size - filled;

  function chooseSize(n: number) {
    setSize(n);
    // Trim selection if the box got smaller.
    let over = filled - n;
    if (over > 0) {
      const next = { ...picks };
      for (const id of Object.keys(next).reverse()) {
        while (over > 0 && (next[id] ?? 0) > 0) {
          next[id] = (next[id] ?? 0) - 1;
          over--;
        }
      }
      setPicks(next);
    }
  }

  function change(p: BoxProduct, delta: number) {
    // Functional update so rapid taps never read stale state.
    setPicks((prev) => {
      const count = Object.values(prev).reduce((n, q) => n + q, 0);
      if (delta > 0 && count >= size) return prev;
      const next = Math.max(0, Math.min((prev[p.id] ?? 0) + delta, p.stock));
      return { ...prev, [p.id]: next };
    });
  }

  function addBox() {
    for (const p of chosen) {
      actions.add({ productId: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image }, picks[p.id] ?? 0);
    }
    toast(`Box of ${size} added to cart`);
    actions.open();
    setPicks({});
    setStep(0);
  }

  return (
    <div className="mx-auto max-w-4xl rounded-md border border-line bg-panel p-5 shadow-card sm:p-9">
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Box builder steps">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className="text-center">
            <span
              className={cn(
                "mx-auto grid size-9 place-items-center rounded-full text-sm font-bold transition",
                i < step ? "bg-success text-espresso" : i === step ? "bg-gold text-espresso" : "bg-panel2 text-fg/70",
              )}
            >
              {i < step ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("mt-1.5 block text-[11px] font-semibold sm:text-xs", i === step ? "text-heading" : "text-fg/70")}>{label}</span>
          </li>
        ))}
      </ol>

      {step >= 1 ? (
        <div className="mb-6 rounded-xl bg-page p-4" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-heading">{filled} of {size} chosen</span>
            <span className="font-display text-xl font-bold text-heading">{formatINR(total)}</span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-panel2" role="progressbar" aria-valuemin={0} aria-valuemax={size} aria-valuenow={filled} aria-label="Box fill">
            <div className="h-full rounded-full bg-caramel transition-all duration-500" style={{ width: `${Math.min(100, (filled / size) * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {step === 0 ? (
        <fieldset key="s0" className="animate-fade-up">
          <legend className="font-display text-2xl text-heading">How many brownies in your box?</legend>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SIZES.map((n) => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name="box-size" value={n} checked={size === n} onChange={() => chooseSize(n)} className="peer sr-only" />
                <span className="grid min-h-24 place-items-center rounded-xl border-2 border-line text-center transition peer-checked:border-choc peer-checked:bg-choc peer-checked:text-cream peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-caramel">
                  <span>
                    <span className="block font-display text-4xl font-bold">{n}</span>
                    <span className="text-xs font-semibold uppercase tracking-widest opacity-70">brownies</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <div key="s1" className="animate-fade-up">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="font-display text-2xl text-heading">Choose your flavours</h3>
            <p className="text-sm font-semibold text-caramel" role="status">
              {remaining > 0 ? `${remaining} more to fill your box of ${size}` : `Your box of ${size} is full`}
            </p>
          </div>
          <ul className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-x-3 gap-y-5 sm:grid-cols-2">
            {products.map((p) => {
              const q = picks[p.id] ?? 0;
              return (
                <li key={p.id} className={cn("relative flex items-center gap-3 rounded-xl border-2 p-2.5 transition-all duration-200", q > 0 ? "border-choc bg-page shadow-card" : "border-line hover:border-caramel/50")}>
                  {q > 0 ? (
                    <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-choc px-2.5 py-0.5 text-[11px] font-bold text-gold">
                      <Check className="size-3" aria-hidden /> Selected
                    </span>
                  ) : null}
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-panel2">
                    <SmartImage src={p.image} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-heading">{p.name}</span>
                    <span className="text-xs text-fg/70">{formatINR(p.price)} each</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => change(p, -1)} disabled={q === 0} aria-label={`Remove one ${p.name}`} className="grid size-10 place-items-center rounded-full hover:bg-panel2 disabled:opacity-30">
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <output className="w-5 text-center text-sm font-bold" aria-live="polite">{q}</output>
                    <button type="button" onClick={() => change(p, 1)} disabled={remaining <= 0 || q >= p.stock} aria-label={`Add one ${p.name}`} className="grid size-10 place-items-center rounded-full bg-choc text-cream disabled:opacity-30">
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {step >= 2 ? (
        <div key={`s${step}`} className="animate-fade-up">
          <h3 className="font-display text-2xl text-heading">{step === 2 ? "Review your box" : "Ready to add"}</h3>
          <ul className="mt-5 divide-y divide-line rounded-md border border-line">
            {chosen.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <strong>{picks[p.id]} ×</strong> {p.name}
                </span>
                <span className="font-semibold">{formatINR(p.price * (picks[p.id] ?? 0))}</span>
              </li>
            ))}
            <li className="flex items-center justify-between bg-page px-4 py-4 text-lg font-bold text-heading">
              <span>Box total ({filled} brownies)</span>
              <span>{formatINR(total)}</span>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          Back
        </Button>
        <p className="hidden text-sm text-fg/70 sm:block">
          {filled > 0 ? `${filled}/${size} chosen · ${formatINR(total)}` : "Prices come from our live menu"}
        </p>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={step === 1 && remaining !== 0}>
            {step === 1 && remaining !== 0 ? `Pick ${remaining} more` : "Continue"}
          </Button>
        ) : (
          <Button variant="caramel" onClick={addBox} disabled={remaining !== 0 || filled === 0}>
            <ShoppingBag className="size-4" aria-hidden /> Add box · {formatINR(total)}
          </Button>
        )}
      </div>
    </div>
  );
}
