"use client";

import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatINR } from "@/lib/utils";

const HIDDEN_ON = [/^\/cart/, /^\/checkout/, /^\/order-success/, /^\/shop\/[^/]+$/];

/** Mobile-only sticky cart summary shown once something is in the cart. */
export function BottomCartBar() {
  const { count, subtotal, actions } = useCart();
  const pathname = usePathname();
  if (count === 0 || HIDDEN_ON.some((r) => r.test(pathname))) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden no-print">
      <button
        type="button"
        onClick={actions.open}
        className="animate-fade-up flex min-h-14 w-full items-center justify-between rounded-full bg-choc px-5 text-cream shadow-lift"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold">
          <ShoppingBag className="size-5 text-gold" aria-hidden />
          {count} {count === 1 ? "item" : "items"}
        </span>
        <span className="text-sm font-bold tracking-wide">View cart · {formatINR(subtotal)}</span>
      </button>
    </div>
  );
}
