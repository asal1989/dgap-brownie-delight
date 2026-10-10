"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Sort } from "@/lib/catalog";

type Props = {
  categories: { slug: string; name: string; count: number }[];
  values: { q: string; category: string; min: string; max: string; sort: Sort };
  showPopular: boolean;
  basePath: string;
  /** Hide the category group on category pages. */
  fixedCategory?: boolean;
};

function FilterForm({ categories, values, showPopular, basePath, fixedCategory, idPrefix }: Props & { idPrefix: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={basePath} method="get" role="search" aria-label="Filter products" className="space-y-7">
      <label className="field">
        <span className="label">Search</span>
        <span className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" name="q" defaultValue={values.q} placeholder="Search brownies" className="input !pl-9" maxLength={80} />
        </span>
      </label>

      {!fixedCategory && (
        <fieldset>
          <legend className="label mb-2 text-[0.8rem] font-semibold">Flavour</legend>
          <ul className="space-y-1">
            <li>
              <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
                <input type="radio" name="category" value="" defaultChecked={!values.category} className="accent-forest" /> All flavours
              </label>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
                  <input type="radio" name="category" value={c.slug} defaultChecked={values.category === c.slug} className="accent-forest" />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-muted">{c.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend className="label mb-2 text-[0.8rem] font-semibold">Price (₹)</legend>
        <div className="flex items-center gap-2">
          <input type="number" name="min" min={0} inputMode="numeric" defaultValue={values.min} placeholder="Min" aria-label="Minimum price in rupees" className="input" />
          <span aria-hidden>–</span>
          <input type="number" name="max" min={0} inputMode="numeric" defaultValue={values.max} placeholder="Max" aria-label="Maximum price in rupees" className="input" />
        </div>
      </fieldset>

      <label className="field">
        <span className="label">Sort by</span>
        <select name="sort" defaultValue={values.sort} className="select" id={`${idPrefix}-sort`}>
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          {showPopular && <option value="popular">Most popular</option>}
        </select>
      </label>

      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary btn-sm flex-1">Apply</button>
        <Link href={basePath} className="btn btn-outline btn-sm flex-1">Clear all</Link>
      </div>
    </form>
  );
}

export function ShopFilters(props: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div className="hidden lg:block"><FilterForm {...props} idPrefix="d" /></div>

      <div className="lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="btn btn-outline btn-sm" aria-haspopup="dialog">
          <SlidersHorizontal size={16} aria-hidden /> Filters & sort
        </button>
        {open && (
          <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="Filters and sorting">
            <button type="button" tabIndex={-1} aria-label="Close filters" className="absolute inset-0 bg-forest-deep/60" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[min(92vw,380px)] overflow-y-auto bg-ivory p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-3xl">Filters</h2>
                <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center hover:bg-ivory-deep" aria-label="Close filters">
                  <X size={22} aria-hidden />
                </button>
              </div>
              <FilterForm {...props} idPrefix="m" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
