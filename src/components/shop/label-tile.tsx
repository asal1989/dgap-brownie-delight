import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

/**
 * Photo tile with a solid label tab sitting on its bottom edge. The whole tile is one link.
 * Used for flavours and the cross-sell row so both read as one system.
 */
export function LabelTile({
  href,
  label,
  image,
  sub,
  aspect = "aspect-[4/5]",
  sizes = "(min-width: 1024px) 16vw, (min-width: 640px) 28vw, 44vw",
}: {
  href: string;
  label: string;
  image: string | null;
  sub?: string | null;
  aspect?: string;
  sizes?: string;
}) {
  return (
    <Link href={href} className="group flex h-full flex-col">
      <span className={cn("relative block w-full overflow-hidden bg-panel2", aspect)}>
        <SmartImage src={image} alt="" fill sizes={sizes} className="object-cover transition-transform duration-1000 group-hover:scale-105" />
        <span className="absolute inset-0 bg-gradient-to-t from-espresso/50 via-transparent to-transparent" aria-hidden />
        <span className="absolute inset-3 border border-gold/0 transition duration-500 group-hover:border-gold/60" aria-hidden />
        <span className="absolute inset-x-0 bottom-0 flex justify-center">
          <span className="max-w-[92%] bg-gold px-5 py-3 text-center text-[11px] font-bold uppercase leading-snug tracking-[0.18em] text-espresso transition group-hover:bg-cream sm:text-xs">
            {label}
          </span>
        </span>
      </span>
      {sub ? <span className="mt-3 text-center text-sm text-fg/75">{sub}</span> : null}
    </Link>
  );
}
