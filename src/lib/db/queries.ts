import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { BoxProduct, ProductCardData } from "@/types";

type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;

async function ratingMap(productIds: string[]): Promise<Map<string, { avg: number; count: number }>> {
  if (productIds.length === 0) return new Map();
  const rows = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.productId, { avg: r._avg.rating ?? 0, count: r._count._all }]));
}

export async function toCards(products: ProductWithCategory[]): Promise<ProductCardData[]> {
  const ratings = await ratingMap(products.map((p) => p.id));
  return products.map((p) => {
    const r = ratings.get(p.id);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      image: p.images[0] ?? null,
      stock: p.stock,
      rating: r && r.count > 0 ? Math.round(r.avg * 10) / 10 : null,
      reviewCount: r?.count ?? 0,
      categoryName: p.category.name,
      isBestSeller: p.isBestSeller,
      isSample: p.isSample,
    };
  });
}

export async function getActiveCategories() {
  return prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({ where: { slug, isActive: true } });
}

export async function getBestSellers(limit = 6) {
  const items = await prisma.product.findMany({
    where: { isActive: true, isBestSeller: true },
    include: { category: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return toCards(items);
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export interface ProductFilters {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  sort?: SortKey;
  flag?: "best" | "featured" | "gift";
  page?: number;
  pageSize?: number;
}

export async function searchProducts(f: ProductFilters) {
  const pageSize = f.pageSize ?? 12;
  const page = Math.max(1, f.page ?? 1);
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    category: { isActive: true, ...(f.category ? { slug: f.category } : {}) },
    ...(f.min != null || f.max != null
      ? { price: { ...(f.min != null ? { gte: f.min } : {}), ...(f.max != null ? { lte: f.max } : {}) } }
      : {}),
    ...(f.flag === "best" ? { isBestSeller: true } : {}),
    ...(f.flag === "featured" ? { isFeatured: true } : {}),
    ...(f.flag === "gift" ? { isGiftBox: true } : {}),
    ...(f.q
      ? {
          OR: [
            { name: { contains: f.q, mode: "insensitive" } },
            { description: { contains: f.q, mode: "insensitive" } },
            { sku: { contains: f.q, mode: "insensitive" } },
            { category: { name: { contains: f.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    f.sort === "price-asc"
      ? [{ price: "asc" }]
      : f.sort === "price-desc"
        ? [{ price: "desc" }]
        : f.sort === "newest"
          ? [{ createdAt: "desc" }]
          : [{ isBestSeller: "desc" }, { isFeatured: "desc" }, { createdAt: "desc" }];
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), products: await toCards(items) };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: true,
      reviews: { where: { isApproved: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function getRelatedProducts(productId: string, categoryId: string, limit = 4) {
  const items = await prisma.product.findMany({
    where: { isActive: true, categoryId, id: { not: productId } },
    include: { category: true },
    take: limit,
    orderBy: { isBestSeller: "desc" },
  });
  return toCards(items);
}

export async function getSignatureProduct(slug: string) {
  if (slug) {
    const p = await prisma.product.findFirst({ where: { slug, isActive: true }, include: { category: true } });
    if (p) return p;
  }
  return prisma.product.findFirst({
    where: { isActive: true, isFeatured: true },
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getApprovedReviews(limit = 6) {
  return prisma.review.findMany({
    where: { isApproved: true },
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getFaqs() {
  return prisma.faq.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { question: "asc" }] });
}

export async function getBoxProducts(): Promise<BoxProduct[]> {
  const items = await prisma.product.findMany({
    where: { isActive: true, isBoxEligible: true, isGiftBox: false, stock: { gt: 0 } },
    orderBy: [{ isBestSeller: "desc" }, { name: "asc" }],
  });
  return items.map((p) => ({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.images[0] ?? null, stock: p.stock }));
}
