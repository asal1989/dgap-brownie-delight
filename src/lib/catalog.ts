import { z } from "zod";

export const SORTS = ["featured", "newest", "price-asc", "price-desc", "popular"] as const;
export type Sort = (typeof SORTS)[number];

export const PAGE_SIZE = 12;

const num = z.coerce.number().int().min(0).max(100_000_000);

export const shopQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  /** Rupees in the URL for readability; converted to paise below. */
  min: num.optional(),
  max: num.optional(),
  sort: z.enum(SORTS).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export type ShopFilters = {
  q?: string;
  category?: string;
  minPaise?: number;
  maxPaise?: number;
  sort: Sort;
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;

/** Parse untrusted URL search params into safe filters. Bad values are dropped rather than throwing. */
export function parseShopFilters(raw: Raw): ShopFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const parsed = shopQuerySchema.safeParse({
    q: first(raw.q) || undefined,
    category: first(raw.category) || undefined,
    min: first(raw.min) || undefined,
    max: first(raw.max) || undefined,
    sort: first(raw.sort) || undefined,
    page: first(raw.page) || undefined,
  });
  const d = parsed.success ? parsed.data : {};
  let minPaise = "min" in d && d.min != null ? d.min * 100 : undefined;
  let maxPaise = "max" in d && d.max != null ? d.max * 100 : undefined;
  if (minPaise != null && maxPaise != null && minPaise > maxPaise) [minPaise, maxPaise] = [maxPaise, minPaise];
  return {
    q: "q" in d ? d.q : undefined,
    category: "category" in d ? d.category : undefined,
    minPaise,
    maxPaise,
    sort: ("sort" in d && d.sort) || "featured",
    page: ("page" in d && d.page) || 1,
  };
}

/** Prisma `where` for the public shop: only active products, matching every supplied filter. */
export function buildProductWhere(f: Pick<ShopFilters, "q" | "category" | "minPaise" | "maxPaise">) {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { shortDescription: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
    ];
  }
  if (f.category) where.category = { slug: f.category, isActive: true };
  if (f.minPaise != null || f.maxPaise != null) {
    where.variants = {
      some: {
        archivedAt: null,
        isAvailable: true,
        priceInPaise: {
          not: null,
          ...(f.minPaise != null ? { gte: f.minPaise } : {}),
          ...(f.maxPaise != null ? { lte: f.maxPaise } : {}),
        },
      },
    };
  }
  return where;
}

export function buildProductOrderBy(sort: Sort) {
  switch (sort) {
    case "price-asc":
      return [{ minPricePaise: { sort: "asc", nulls: "last" } }, { sortOrder: "asc" }] as const;
    case "price-desc":
      return [{ minPricePaise: { sort: "desc", nulls: "last" } }, { sortOrder: "asc" }] as const;
    case "popular":
      return [{ soldCount: "desc" }, { sortOrder: "asc" }] as const;
    case "newest":
      return [{ createdAt: "desc" }] as const;
    default:
      return [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }] as const;
  }
}

/** Serialise filters back to a query string (omitting defaults) for links and pagination. */
export function filtersToQuery(f: Partial<ShopFilters>, overrides: Partial<ShopFilters> = {}): string {
  const m = { ...f, ...overrides };
  const p = new URLSearchParams();
  if (m.q) p.set("q", m.q);
  if (m.category) p.set("category", m.category);
  if (m.minPaise != null) p.set("min", String(Math.round(m.minPaise / 100)));
  if (m.maxPaise != null) p.set("max", String(Math.round(m.maxPaise / 100)));
  if (m.sort && m.sort !== "featured") p.set("sort", m.sort);
  if (m.page && m.page > 1) p.set("page", String(m.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
