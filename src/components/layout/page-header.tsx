import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/ui/json-ld";
import { siteUrl } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: siteUrl(c.href) } : {}),
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-fg/70">
      <JsonLd data={ld} />
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1">
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="hover:text-heading hover:underline">{c.label}</Link>
            ) : (
              <span aria-current="page" className="font-semibold text-heading">{c.label}</span>
            )}
            {i < items.length - 1 ? <ChevronRight className="size-3.5" aria-hidden /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, subtitle, crumbs }: { title: string; subtitle?: string; crumbs?: Crumb[] }) {
  return (
    <div className="border-b border-line bg-panel2/30">
      <div className="container-page py-10 lg:py-14">
        {crumbs ? <Breadcrumbs items={crumbs} /> : null}
        <h1 className="mt-3 text-balance text-4xl font-semibold text-heading sm:text-5xl">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-2xl text-lg text-fg/70">{subtitle}</p> : null}
      </div>
    </div>
  );
}
