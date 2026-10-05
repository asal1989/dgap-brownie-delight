"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterState {
  q: string;
  category: string;
  min: string;
  max: string;
  sort: string;
  flag: string;
}

const field = "h-12 w-full rounded-xl border border-beige bg-white px-4 text-sm outline-none focus:border-caramel";

/** One GET form: works without JS, renders as a sidebar on desktop and a drawer on mobile. */
export function ShopFilters({
  categories,
  state,
  lockedCategory,
  action,
}: {
  categories: { slug: string; name: string }[];
  state: FilterState;
  lockedCategory?: boolean;
  action: string;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = [state.q, state.category && !lockedCategory ? state.category : "", state.min, state.max, state.flag].filter(Boolean).length;

  return (
    <>
      <div className="flex gap-2 lg:hidden">
        <Button variant="outline" size="md" onClick={() => setOpen(true)} aria-haspopup="dialog" className="flex-1">
          <SlidersHorizontal className="size-4" aria-hidden /> Filters{activeCount ? ` (${activeCount})` : ""}
        </Button>
      </div>

      {open ? <div className="fixed inset-0 z-[55] bg-espresso/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden /> : null}

      <form
        method="get"
        action={action}
        role={open ? "dialog" : "search"}
        aria-label="Filter and sort products"
        aria-modal={open || undefined}
        className={cn(
          "space-y-6 bg-cream",
          open
            ? "fixed inset-y-0 left-0 z-[56] w-[88%] max-w-sm overflow-y-auto p-5 shadow-2xl lg:static lg:w-auto lg:max-w-none lg:overflow-visible lg:p-0 lg:shadow-none"
            : "hidden lg:block",
        )}
      >
        <div className="flex items-center justify-between lg:hidden">
          <h2 className="font-display text-2xl text-choc">Filters</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="grid size-11 place-items-center rounded-full hover:bg-beige/70">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div>
          <label htmlFor="f-q" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-caramel">Search</label>
          <input id="f-q" name="q" type="search" defaultValue={state.q} placeholder="Name, flavour, SKU…" className={field} />
        </div>

        {!lockedCategory ? (
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-caramel">Category</legend>
            <div className="space-y-1">
              {[{ slug: "", name: "All" }, ...categories].map((c) => (
                <label key={c.slug} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm hover:bg-beige/50">
                  <input type="radio" name="category" value={c.slug} defaultChecked={state.category === c.slug} className="size-4 accent-[var(--choc)]" />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-caramel">Price (₹)</legend>
          <div className="flex items-center gap-2">
            <input name="min" type="number" inputMode="numeric" min={0} defaultValue={state.min} placeholder="Min" aria-label="Minimum price" className={field} />
            <span aria-hidden>–</span>
            <input name="max" type="number" inputMode="numeric" min={0} defaultValue={state.max} placeholder="Max" aria-label="Maximum price" className={field} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-caramel">Collection</legend>
          <div className="space-y-1">
            {[
              { v: "", l: "Everything" },
              { v: "best", l: "Best sellers" },
              { v: "featured", l: "Featured" },
              { v: "gift", l: "Gift boxes" },
            ].map((o) => (
              <label key={o.v} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm hover:bg-beige/50">
                <input type="radio" name="flag" value={o.v} defaultChecked={state.flag === o.v} className="size-4 accent-[var(--choc)]" />
                {o.l}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="f-sort" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-caramel">Sort by</label>
          <select id="f-sort" name="sort" defaultValue={state.sort} className={field}>
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" onClick={() => setOpen(false)}>Apply</Button>
          <a href={action} className="inline-flex min-h-12 items-center rounded-full px-5 text-sm font-semibold text-choc hover:bg-beige/60">Reset</a>
        </div>
      </form>
    </>
  );
}
