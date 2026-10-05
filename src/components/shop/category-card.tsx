import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";

export function CategoryCard({ name, slug, image, description }: { name: string; slug: string; image: string | null; description: string | null }) {
  return (
    <Link
      href={`/categories/${slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-choc text-cream transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <span className="relative block aspect-square overflow-hidden bg-beige">
        <SmartImage
          src={image}
          alt=""
          fill
          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 28vw, 44vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </span>
      <span className="flex flex-1 flex-col p-4">
        <span className="font-display text-xl font-semibold leading-tight text-cream">{name}</span>
        {description ? <span className="mt-1 line-clamp-2 text-xs text-cream/70">{description}</span> : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
          Explore <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}
