import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge, PriceDisplay, RatingStars } from "@/components/ui/primitives";
import { CardCartControls } from "@/components/cart/add-to-cart";
import { discountPercent } from "@/lib/utils";
import type { ProductCardData } from "@/types";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const pct = discountPercent(product.price, product.compareAtPrice);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-beige/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-caramel/40 hover:shadow-lift">
      <Link href={`/shop/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-beige">
        <SmartImage
          src={product.image}
          alt={product.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 70vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
        />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.isBestSeller ? <Badge tone="dark">Best seller</Badge> : null}
          {pct > 0 ? <Badge tone="gold">{pct}% off</Badge> : null}
          {product.stock <= 0 ? <Badge tone="light">Sold out</Badge> : null}
        </div>
        {product.isSample ? <span className="absolute bottom-2 right-2 rounded bg-white/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink/70">Sample</span> : null}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4 sm:p-5">
        {product.categoryName ? <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-caramel">{product.categoryName}</p> : null}
        <h3 className="font-display text-lg font-semibold leading-snug text-choc sm:text-xl">
          <Link href={`/shop/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        {product.shortDescription ? <p className="line-clamp-2 text-sm text-ink/65">{product.shortDescription}</p> : null}
        <RatingStars rating={product.rating} count={product.reviewCount} />
        <div className="mt-auto pt-3">
          <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} />
        </div>
        <div className="pt-3">
          <CardCartControls
            product={{ productId: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image, stock: product.stock }}
          />
        </div>
      </div>
    </article>
  );
}
