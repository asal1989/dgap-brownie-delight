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
    const current = picks[p.id] ?? 0;
    const next = Math.max(0, Math.min(current + delta, p.stock));
    if (delta > 0 && remaining <= 0) return;
    setPicks({ ...picks, [p.id]: next });
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
    <div className="mx-auto max-w-4xl rounded-[2rem] bg-white p-5 shadow-card sm:p-8">
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Box builder steps">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className="text-center">
            <span
              className={cn(
                "mx-auto grid size-9 place-items-center rounded-full text-sm font-bold transition",
                i < step ? "bg-success text-white" : i === step ? "bg-choc text-gold" : "bg-beige text-ink/50",
              )}
            >
              {i < step ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("mt-1.5 block text-[11px] font-semibold sm:text-xs", i === step ? "text-choc" : "text-ink/50")}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <fieldset>
          <legend className="font-display text-2xl text-choc">How many brownies in your box?</legend>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SIZES.map((n) => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name="box-size" value={n} checked={size === n} onChange={() => chooseSize(n)} className="peer sr-only" />
                <span className="grid min-h-24 place-items-center rounded-2xl border-2 border-beige text-center transition peer-checked:border-choc peer-checked:bg-choc peer-checked:text-cream peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-caramel">
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
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="font-display text-2xl text-choc">Choose your flavours</h3>
            <p className="text-sm font-semibold text-caramel" role="status">
              {remaining > 0 ? `${remaining} more to fill your box of ${size}` : `Your box of ${size} is full`}
            </p>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {products.map((p) => {
              const q = picks[p.id] ?? 0;
              return (
                <li key={p.id} className={cn("flex items-center gap-3 rounded-2xl border-2 p-2.5 transition", q > 0 ? "border-choc bg-cream" : "border-beige")}>
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-beige">
                    <SmartImage src={p.image} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-choc">{p.name}</span>
                    <span className="text-xs text-ink/60">{formatINR(p.price)} each</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => change(p, -1)} disabled={q === 0} aria-label={`Remove one ${p.name}`} className="grid size-10 place-items-center rounded-full hover:bg-beige disabled:opacity-30">
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
        <div>
          <h3 className="font-display text-2xl text-choc">{step === 2 ? "Review your box" : "Ready to add"}</h3>
          <ul className="mt-5 divide-y divide-beige rounded-2xl border border-beige">
            {chosen.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <strong>{picks[p.id]} ×</strong> {p.name}
                </span>
                <span className="font-semibold">{formatINR(p.price * (picks[p.id] ?? 0))}</span>
              </li>
            ))}
            <li className="flex items-center justify-between bg-cream px-4 py-4 text-lg font-bold text-choc">
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
        <p className="hidden text-sm text-ink/60 sm:block">
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
