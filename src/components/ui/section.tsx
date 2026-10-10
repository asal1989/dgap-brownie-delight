import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/money";
import { Reveal } from "./reveal";

export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "center",
  id,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "center" | "left";
  id?: string;
  as?: "h1" | "h2";
}) {
  const center = align === "center";
  return (
    <Reveal className={`mb-12 sm:mb-16 ${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}`}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <Tag id={id} className="text-[clamp(2.2rem,4.6vw,3.5rem)]">{title}</Tag>
      <span className={`rule-gold mt-6 ${center ? "mx-auto" : ""}`} aria-hidden />
      {sub && <p className={`mt-6 text-[1.05rem] text-muted ${center ? "" : "max-w-xl"}`}>{sub}</p>}
    </Reveal>
  );
}

export function Price({ paise, compareAtPaise, from }: { paise: number | null; compareAtPaise?: number | null; from?: boolean }) {
  if (paise == null) return <span className="text-sm text-muted">Price on request</span>;
  return (
    <span className="inline-flex items-baseline gap-2">
      {from && <span className="text-xs uppercase tracking-[0.14em] text-muted">From</span>}
      <span className="font-serif text-[1.35rem] font-semibold text-forest">{formatINR(paise)}</span>
      {compareAtPaise != null && compareAtPaise > paise && <s className="text-sm text-muted">{formatINR(compareAtPaise)}</s>}
    </span>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="mx-auto max-w-lg border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      <h2 className="text-3xl">{title}</h2>
      {children && <div className="mt-3 text-muted">{children}</div>}
      {action && (
        <Link href={action.href} className="btn btn-primary mt-7">
          {action.label} <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function PageHero({ eyebrow, title, sub }: { eyebrow?: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <section className="on-dark bg-forest py-16 sm:py-24">
      <div className="container-x max-w-4xl text-center">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h1 className="text-[clamp(2.6rem,6vw,4.4rem)]">{title}</h1>
        <span className="rule-gold mx-auto mt-6" aria-hidden />
        {sub && <p className="mx-auto mt-6 max-w-2xl text-lg text-ivory/80">{sub}</p>}
      </div>
    </section>
  );
}
