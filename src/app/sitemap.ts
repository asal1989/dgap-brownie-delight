import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const statics = ["", "/shop", "/about", "/contact", "/faq", "/privacy-policy", "/terms", "/shipping-policy", "/refund-policy"];
  return [
    ...statics.map((p) => ({ url: siteUrl(p || "/"), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...categories.map((c) => ({ url: siteUrl(`/categories/${c.slug}`), lastModified: c.updatedAt, priority: 0.7 })),
    ...products.map((p) => ({ url: siteUrl(`/shop/${p.slug}`), lastModified: p.updatedAt, priority: 0.8 })),
  ];
}
