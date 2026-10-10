import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductCardData } from "@/lib/store-queries";
import { Price } from "@/components/ui/section";

/** Editorial product tile: consistent 4:5 image, quiet text, gold hairline hover. */
export function ProductCard({ p, priority = false }: { p: ProductCardData; priority?: boolean }) {
  return (
    <article className="group flex flex-col">
      <Link href={`/shop/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-ivory-deep" aria-label={`${p.name}${p.fromPricePaise != null ? "" : ", price on request"}`}>
        {p.image && (
          <Image
            src={p.image.url}
            alt={p.image.alt}
            fill
            sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 92vw"
            priority={priority}
            className="object-cover transition-transform duration-[1200ms] ease-out-soft group-hover:scale-[1.05]"
          />
        )}
        <span className="pointer-events-none absolute inset-3 border border-gold/0 transition-colors duration-500 group-hover:border-gold/70" aria-hidden />
        {p.soldOut ? (
          <span className="absolute left-3 top-3 bg-espresso px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ivory">Sold out</span>
        ) : p.isBestseller ? (
          <span className="absolute left-3 top-3 bg-ivory px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-forest">Bestseller</span>
        ) : null}
      </Link>
      <div className="px-0.5 pt-5 text-center">
        {p.category && <p className="eyebrow mb-2">{p.category.name}</p>}
        <h3 className="text-[1.65rem]">
          <Link href={`/shop/${p.slug}`} className="hover:text-gold-deep">{p.name}</Link>
        </h3>
        <p className="mx-auto mt-2 max-w-[28ch] text-sm text-muted">{p.shortDescription}</p>
        <p className="mt-3"><Price paise={p.fromPricePaise} compareAtPaise={p.comparePricePaise} from={p.fromPricePaise != null} /></p>
        <Link href={`/shop/${p.slug}`} className="mt-3 inline-flex items-center gap-2 border-b border-gold pb-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-forest transition-[gap] hover:gap-3">
          View details <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function ProductGridList({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <ul className="grid gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p, i) => (
        <li key={p.id}><ProductCard p={p} priority={i < priorityCount} /></li>
      ))}
    </ul>
  );
}
