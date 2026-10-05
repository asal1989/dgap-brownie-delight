import { ProductCard } from "@/components/shop/product-card";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/types";

export function ProductGrid({ products, columns = 4 }: { products: ProductCardData[]; columns?: 3 | 4 }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}
