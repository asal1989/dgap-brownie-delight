"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/hooks/toast-store";
import { formatINR } from "@/lib/utils";
import type { CartProduct } from "@/components/cart/add-to-cart";

/** Mobile-only purchase bar pinned to the bottom of product pages. */
export function StickyBuyBar({ product, whatsappHref }: { product: CartProduct; whatsappHref: string | null }) {
  const { actions } = useCart();
  const router = useRouter();
  if (product.stock <= 0) return null;
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-beige bg-white/95 p-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-2">
        <div className="min-w-0 pr-1">
          <p className="hidden max-w-40 truncate text-xs text-ink/60 sm:block">{product.name}</p>
          <p className="text-xl font-bold leading-tight text-choc">{formatINR(product.price)}</p>
        </div>
        {whatsappHref ? (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Order on WhatsApp" className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-[#1f8f4e] text-[#1f8f4e]">
            <MessageCircle className="size-5" aria-hidden />
          </a>
        ) : null}
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() => {
            actions.add({ productId: product.productId, slug: product.slug, name: product.name, price: product.price, image: product.image });
            toast(`${product.name} added to cart`);
          }}
        >
          <ShoppingBag className="size-4" aria-hidden /> Add
        </Button>
        <Button
          variant="caramel"
          onClick={() => {
            actions.add({ productId: product.productId, slug: product.slug, name: product.name, price: product.price, image: product.image });
            router.push("/checkout");
          }}
        >
          Buy now
        </Button>
      </div>
    </div>
  );
}
