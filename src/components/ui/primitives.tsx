import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn, discountPercent, formatINR } from "@/lib/utils";

export function Badge({ children, tone = "dark", className }: { children: ReactNode; tone?: "dark" | "gold" | "light" | "success"; className?: string }) {
  const tones = {
    dark: "bg-gold text-espresso",
    gold: "bg-cream text-espresso",
    light: "bg-espresso/80 text-cream backdrop-blur",
    success: "bg-success/15 text-success",
  };
  return (
    <span className={cn("inline-flex items-center rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]", tones[tone], className)}>
      {children}
    </span>
  );
}

export function RatingStars({ rating, count, size = "sm" }: { rating: number | null; count?: number; size?: "sm" | "md" }) {
  if (rating == null) return null;
  const dim = size === "md" ? "size-5" : "size-4";
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`Rated ${rating} out of 5${count ? ` from ${count} reviews` : ""}`}>
      <div className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn(dim, i <= Math.round(rating) ? "fill-gold text-gold" : "text-fg/25")} />
        ))}
      </div>
      <span className="text-xs font-semibold text-fg/70">
        {rating.toFixed(1)}
        {count ? ` (${count})` : ""}
      </span>
    </div>
  );
}

export function PriceDisplay({ price, compareAtPrice, size = "md" }: { price: number; compareAtPrice?: number | null; size?: "md" | "lg" }) {
  const pct = discountPercent(price, compareAtPrice);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={cn("font-bold text-heading", size === "lg" ? "text-3xl" : "text-lg")}>{formatINR(price)}</span>
      {pct > 0 && compareAtPrice ? (
        <>
          <span className="text-sm text-fg/70 line-through">
            <span className="sr-only">Original price </span>
            {formatINR(compareAtPrice)}
          </span>
          <span className="text-xs font-bold text-success">{pct}% off</span>
        </>
      ) : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  tone = "dark",
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  align?: "center" | "left";
  tone?: "dark" | "light";
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "text-left")}>
      {eyebrow ? (
        <p className="mb-4 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-gold">
          {align === "center" ? <span className="h-px w-8 bg-gold/70" aria-hidden /> : null}
          {eyebrow}
          {align === "center" ? <span className="h-px w-8 bg-gold/70" aria-hidden /> : null}
        </p>
      ) : null}
      <Tag className={cn("text-balance text-3xl font-semibold leading-[1.1] sm:text-4xl lg:text-5xl", tone === "light" ? "text-cream" : "text-heading")}>
        {title}
      </Tag>
      {subtitle ? <p className={cn("mt-4 text-pretty text-base sm:text-lg", tone === "light" ? "text-cream/75" : "text-fg/70")}>{subtitle}</p> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-line bg-panel px-6 py-14 text-center">
      <p className="font-display text-2xl text-heading">{title}</p>
      {text ? <p className="mt-2 text-fg/70">{text}</p> : null}
      {children ? <div className="mt-6 flex justify-center">{children}</div> : null}
    </div>
  );
}
