import { cache } from "react";
import { db } from "./db";
import { buildProductOrderBy, buildProductWhere, PAGE_SIZE, type ShopFilters } from "./catalog";

/** Whether a variant can be bought right now: priced, available, in stock (when tracked). */
export const isPurchasable = (v: {
  priceInPaise: number | null;
  isAvailable: boolean;
  archivedAt: Date | null;
  trackInventory: boolean;
  stockQuantity: number;
}) => v.archivedAt == null && v.isAvailable && v.priceInPaise != null && (!v.trackInventory || v.stockQuantity > 0);

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" as const } },
  category: true,
};

export type StoreProduct = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: { slug: string; name: string } | null;
  image: { url: string; alt: string } | null;
  secondImage: { url: string; alt: string } | null;
  fromPricePaise: number | null;
  comparePricePaise: number | null;
  purchasable: boolean;
  soldOut: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  labels: string[];
  kind: "STANDARD" | "CUSTOM_BOX";
};

type CardSource = Awaited<ReturnType<typeof listActive>>[number];

export function toCard(p: CardSource): ProductCardData {
  const purchasable = p.variants.filter(isPurchasable);
  const priced = p.variants.filter((v) => v.priceInPaise != null && v.isAvailable);
  const base = purchasable.length ? purchasable : priced;
  const cheapest = base.length ? base.reduce((a, b) => (a.priceInPaise! <= b.priceInPaise! ? a : b)) : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    category: p.category ? { slug: p.category.slug, name: p.category.name } : null,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
    secondImage: p.images[1] ? { url: p.images[1].url, alt: p.images[1].alt } : null,
    fromPricePaise: cheapest?.priceInPaise ?? null,
    comparePricePaise: cheapest?.compareAtPriceInPaise ?? null,
    purchasable: purchasable.length > 0,
    soldOut: priced.length > 0 && purchasable.length === 0,
    isBestseller: p.isBestseller,
    isFeatured: p.isFeatured,
    labels: p.dietaryLabels,
    kind: p.kind,
  };
}

async function listActive(args: { where?: object; orderBy?: readonly object[]; take?: number; skip?: number }) {
  return db.product.findMany({
    where: { status: "ACTIVE", ...(args.where ?? {}) },
    orderBy: (args.orderBy ?? [{ sortOrder: "asc" }, { name: "asc" }]) as never,
    take: args.take,
    skip: args.skip,
    include: productInclude,
  });
}

export const getCategories = cache(async () =>
  db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  }),
);

export const getCategoryBySlug = cache(async (slug: string) => db.category.findFirst({ where: { slug, isActive: true } }));

export async function getBestsellers(limit = 6): Promise<ProductCardData[]> {
  const flagged = await listActive({ where: { isBestseller: true, kind: "STANDARD" }, take: limit });
  const rows = flagged.length >= limit ? flagged : [...flagged, ...(await listActive({ where: { kind: "STANDARD", isBestseller: false }, take: limit - flagged.length }))];
  return rows.map(toCard);
}

export async function getFeaturedProduct(): Promise<ProductCardData | null> {
  const [p] = await listActive({ where: { isFeatured: true }, take: 1 });
  return p ? toCard(p) : null;
}

export async function listShopProducts(f: ShopFilters) {
  const where = buildProductWhere(f);
  const [total, rows] = await Promise.all([
    db.product.count({ where: where as never }),
    listActive({ where, orderBy: buildProductOrderBy(f.sort), take: PAGE_SIZE, skip: (f.page - 1) * PAGE_SIZE }),
  ]);
  return { total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), products: rows.map(toCard) };
}

export async function hasSalesData(): Promise<boolean> {
  return (await db.product.count({ where: { soldCount: { gt: 0 } } })) > 0;
}

export const getProductBySlug = cache(async (slug: string) =>
  db.product.findFirst({ where: { slug, status: "ACTIVE" }, include: productInclude }),
);

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4) {
  const rows = await listActive({ where: { id: { not: productId }, kind: "STANDARD", ...(categoryId ? { categoryId } : {}) }, take: limit });
  const more = rows.length < limit ? await listActive({ where: { id: { notIn: [productId, ...rows.map((r) => r.id)] }, kind: "STANDARD" }, take: limit - rows.length }) : [];
  return [...rows, ...more].map(toCard);
}

/** Everything the box builder needs: purchasable box sizes and the flavours customers can pick. */
export async function getBoxBuilderData() {
  const [boxes, flavours] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", kind: "CUSTOM_BOX" },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { where: { archivedAt: null, pieces: { not: null } }, orderBy: { pieces: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    listActive({ where: { kind: "STANDARD", boxSelectable: true } }),
  ]);
  const sizes = boxes.flatMap((b) =>
    b.variants.map((v) => ({
      variantId: v.id,
      productName: b.name,
      productSlug: b.slug,
      image: b.images[0]?.url ?? null,
      label: v.label,
      pieces: v.pieces!,
      pricePaise: v.priceInPaise,
      purchasable: isPurchasable(v),
    })),
  );
  const picks = flavours
    .filter((p) => p.variants.some((v) => v.isAvailable))
    .map((p) => ({ productId: p.id, name: p.name, shortDescription: p.shortDescription, image: p.images[0]?.url ?? null, imageAlt: p.images[0]?.alt ?? p.name }));
  return { sizes, picks };
}

export const getApprovedReviews = (limit = 6) =>
  db.review.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { product: { select: { name: true, slug: true } } },
  });

export const getProductReviews = (productId: string) =>
  db.review.findMany({ where: { productId, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20 });
