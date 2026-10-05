"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/hooks/toast-store";
import { cn } from "@/lib/utils";
import type { CartLine } from "@/types";

export type CartProduct = Pick<CartLine, "productId" | "slug" | "name" | "price" | "image"> & { stock: number };

function toLine(p: CartProduct): Omit<CartLine, "quantity"> {
  return { productId: p.productId, slug: p.slug, name: p.name, price: p.price, image: p.image };
}

/** Product-card controls: Add to cart, then a quantity stepper once it is in the cart. */
export function CardCartControls({ product }: { product: CartProduct }) {
  const { lines, actions } = useCart();
  const inCart = lines.find((l) => l.productId === product.productId)?.quantity ?? 0;
  const soldOut = product.stock <= 0;

  if (soldOut) {
    return (
      <Button variant="outline" size="md" disabled className="w-full">
        Sold out
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {inCart > 0 ? (
        <QuantityStepper
          size="md"
          className="w-full justify-between border-choc/30 bg-choc/5"
          value={inCart}
          min={0}
          max={Math.min(20, product.stock)}
          label={product.name}
          onChange={(q) => actions.setQuantity(product.productId, q)}
        />
      ) : (
        <Button
          variant="primary"
          className="group/btn w-full"
          onClick={() => {
            actions.add(toLine(product));
            toast(`${product.name} added to cart`);
          }}
        >
          <ShoppingBag className="size-4 transition-transform group-hover/btn:-rotate-12" aria-hidden />
          Add to cart
        </Button>
      )}
    </div>
  );
}

/** Product-page controls with a quantity picker. */
export function ProductPurchase({ product, className }: { product: CartProduct; className?: string }) {
  const { actions } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const soldOut = product.stock <= 0;
  const max = Math.max(1, Math.min(20, product.stock));

  if (soldOut) {
    return (
      <p className={cn("rounded-md bg-danger/10 px-4 py-3 text-sm font-semibold text-danger", className)} role="status">
        This brownie is sold out right now.
      </p>
    );
  }
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-fg/70">Quantity</span>
        <QuantityStepper value={qty} onChange={(n) => setQty(Math.max(1, Math.min(max, n)))} min={1} max={max} label={product.name} />
        {product.stock <= 5 ? <span className="text-xs font-semibold text-caramel">Only {product.stock} left</span> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            actions.add(toLine(product), qty);
            toast(`${qty} × ${product.name} added to cart`);
          }}
        >
          <ShoppingBag className="size-5" aria-hidden /> Add to cart
        </Button>
        <Button
          size="lg"
          variant="caramel"
          onClick={() => {
            actions.add(toLine(product), qty);
            router.push("/checkout");
          }}
        >
          Buy now
        </Button>
      </div>
    </div>
  );
}
