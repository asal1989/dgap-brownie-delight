import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShopFilters, type FilterState } from "@/components/shop/shop-filters";
import { ProductGrid } from "@/components/shop/product-grid";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { getActiveCategories, searchProducts, type ProductFilters, type SortKey } from "@/lib/db/queries";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (v: string): number | undefined => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const SORTS: SortKey[] = ["featured", "newest", "price-asc", "price-desc"];
const FLAGS = ["best", "featured", "gift"] as const;

export function parseShopParams(sp: SP, fixedCategory?: string) {
  const state: FilterState = {
    q: first(sp.q).trim().slice(0, 60),
    category: fixedCategory ?? first(sp.category),
    min: first(sp.min),
    max: first(sp.max),
    sort: SORTS.includes(first(sp.sort) as SortKey) ? first(sp.sort) : "featured",
    flag: (FLAGS as readonly string[]).includes(first(sp.flag)) ? first(sp.flag) : "",
  };
  const page = Math.max(1, num(first(sp.page)) ?? 1);
  const filters: ProductFilters = {
    q: state.q || undefined,
    category: state.category || undefined,
    min: num(state.min),
    max: num(state.max),
    sort: state.sort as SortKey,
    flag: (state.flag || undefined) as ProductFilters["flag"],
    page,
    pageSize: 12,
  };
  return { state, filters };
}

export async function Catalog({ sp, basePath, fixedCategory }: { sp: SP; basePath: string; fixedCategory?: string }) {
  const { state, filters } = parseShopParams(sp, fixedCategory);
  const [categories, result] = await Promise.all([getActiveCategories(), searchProducts(filters)]);

  const hrefFor = (page: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(state)) if (v && !(k === "category" && fixedCategory) && !(k === "sort" && v === "featured")) qs.set(k, v);
    if (page > 1) qs.set("page", String(page));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_1fr] lg:gap-12">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <ShopFilters categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} state={state} lockedCategory={!!fixedCategory} action={basePath} />
      </aside>
      <div>
        <p className="mb-5 text-sm text-ink/70" role="status">
          {result.total === 0 ? "No products found" : `${result.total} ${result.total === 1 ? "brownie" : "brownies"}`}
          {state.q ? ` for “${state.q}”` : ""}
        </p>
        <h2 className="sr-only">Products</h2>
        {result.products.length === 0 ? (
          <EmptyState
            title={state.q ? "No brownies match your search" : "No products here yet"}
            text={state.q ? "Try a different word or clear your filters." : "Check back soon for fresh bakes."}
          >
            <ButtonLink href={basePath} variant="outline">Clear filters</ButtonLink>
          </EmptyState>
        ) : (
          <ProductGrid products={result.products} columns={3} />
        )}

        {result.pages > 1 ? (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
            {result.page > 1 ? (
              <Link href={hrefFor(result.page - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-beige px-4 text-sm font-semibold hover:bg-beige/60" rel="prev">
                <ChevronLeft className="size-4" aria-hidden /> Previous
              </Link>
            ) : null}
            <span className="px-3 text-sm text-ink/70">Page {result.page} of {result.pages}</span>
            {result.page < result.pages ? (
              <Link href={hrefFor(result.page + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-choc px-5 text-sm font-semibold text-cream hover:bg-espresso" rel="next">
                Next <ChevronRight className="size-4" aria-hidden />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
