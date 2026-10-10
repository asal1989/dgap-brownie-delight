import Link from "next/link";
import { X } from "lucide-react";
import { filtersToQuery, type ShopFilters } from "@/lib/catalog";
import { getCategories, hasSalesData, listShopProducts } from "@/lib/store-queries";
import { formatINR } from "@/lib/money";
import { EmptyState } from "@/components/ui/section";
import { ProductGridList } from "./product-card";
import { Pagination } from "./pagination";
import { ShopFilters as FiltersPanel } from "./shop-filters";

/** Shared by /shop and /categories/[slug]: filters, active chips, grid, empty state and pagination. */
export async function CatalogView({ filters, basePath, fixedCategory = false }: { filters: ShopFilters; basePath: string; fixedCategory?: boolean }) {
  const [{ products, total, pages }, categories, showPopular] = await Promise.all([listShopProducts(filters), getCategories(), hasSalesData()]);
  const href = (over: Partial<ShopFilters>) => `${basePath}${filtersToQuery(filters, over)}`;

  const chips: { label: string; remove: string }[] = [];
  if (filters.q) chips.push({ label: `“${filters.q}”`, remove: href({ q: undefined, page: 1 }) });
  if (filters.category && !fixedCategory) {
    chips.push({ label: categories.find((c) => c.slug === filters.category)?.name ?? filters.category, remove: href({ category: undefined, page: 1 }) });
  }
  if (filters.minPaise != null) chips.push({ label: `Min ${formatINR(filters.minPaise)}`, remove: href({ minPaise: undefined, page: 1 }) });
  if (filters.maxPaise != null) chips.push({ label: `Max ${formatINR(filters.maxPaise)}`, remove: href({ maxPaise: undefined, page: 1 }) });

  return (
    <div className="container-x grid gap-12 py-14 lg:grid-cols-[17rem_1fr]">
      <aside aria-label="Filters" className="lg:sticky lg:top-28 lg:self-start">
        <FiltersPanel
          basePath={basePath}
          fixedCategory={fixedCategory}
          showPopular={showPopular}
          categories={categories.filter((c) => c._count.products > 0).map((c) => ({ slug: c.slug, name: c.name, count: c._count.products }))}
          values={{ q: filters.q ?? "", category: filters.category ?? "", min: filters.minPaise != null ? String(filters.minPaise / 100) : "", max: filters.maxPaise != null ? String(filters.maxPaise / 100) : "", sort: filters.sort }}
        />
      </aside>

      <section aria-label="Products">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <p className="mr-auto text-sm text-muted" role="status">{total} {total === 1 ? "brownie" : "brownies"}</p>
          {chips.map((c) => (
            <Link key={c.label} href={c.remove} className="inline-flex items-center gap-2 border border-gold px-3 py-1.5 text-xs font-medium text-forest hover:bg-gold/20">
              {c.label} <X size={13} aria-label="Remove filter" />
            </Link>
          ))}
          {chips.length > 0 && <Link href={basePath} className="link-underline text-xs font-semibold uppercase tracking-[0.14em] text-forest">Clear all</Link>}
        </div>

        {products.length === 0 ? (
          <EmptyState title="No brownies match" action={{ href: basePath, label: "Clear all filters" }}>
            {filters.q ? <>We could not find anything for “{filters.q}”. Try a different word or clear your filters.</> : <>Nothing matches these filters. Try widening them.</>}
          </EmptyState>
        ) : (
          <ProductGridList products={products} priorityCount={3} />
        )}
        <Pagination page={filters.page} pages={pages} hrefFor={(n) => href({ page: n })} />
      </section>
    </div>
  );
}
