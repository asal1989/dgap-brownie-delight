"use client";

import { useEffect, useRef } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

export function CartButton({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { count, actions, hydrated } = useCart();
  const badge = useRef<HTMLSpanElement>(null);

  // Replay the pop animation whenever the count changes.
  useEffect(() => {
    const el = badge.current;
    if (!el || !hydrated) return;
    el.classList.remove("animate-pop");
    void el.offsetWidth;
    el.classList.add("animate-pop");
  }, [count, hydrated]);

  return (
    <button
      type="button"
      onClick={actions.open}
      aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
      aria-haspopup="dialog"
      className={`relative grid size-11 place-items-center rounded-full transition hover:bg-panel2 ${tone === "light" ? "text-cream hover:bg-white/10" : "text-heading"}`}
    >
      <ShoppingBag className="size-6" aria-hidden />
      {count > 0 ? (
        <span
          ref={badge}
          className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold leading-5 text-espresso"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
