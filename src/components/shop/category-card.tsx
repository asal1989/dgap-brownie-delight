import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";

export function CategoryCard({ name, slug, image, description }: { name: string; slug: string; image: string | null; description: string | null }) {
  return (
    <Link
      href={`/categories/${slug}`}
      className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl bg-choc p-5 text-cream"
    >
      <SmartImage
        src={image}
        alt=""
        fill
        sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
        className="-z-10 object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-espresso/90 via-espresso/30 to-transparent" aria-hidden />
      <h3 className="font-display text-xl font-semibold leading-tight sm:text-2xl">{name}</h3>
      {description ? <p className="mt-1 line-clamp-2 text-xs text-cream/75">{description}</p> : null}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-gold">
        Explore <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
