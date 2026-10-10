import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const fixed = ["", "/shop", "/gift-boxes", "/build-your-box", "/about", "/contact", "/shipping", "/refunds", "/privacy", "/terms"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...categories.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/shop/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
