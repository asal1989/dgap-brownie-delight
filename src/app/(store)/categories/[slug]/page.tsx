import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/store/skeletons";
import { CatalogView } from "@/components/store/catalog-view";
import { PageHero } from "@/components/ui/section";
import { parseShopFilters } from "@/lib/catalog";
import { getCategoryBySlug } from "@/lib/store-queries";

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryBySlug(slug);
  if (!c) return {};
  return { title: c.name, description: c.description ?? `Shop ${c.name} from DGAP Brownie Delight.`, alternates: { canonical: `/categories/${c.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const filters = { ...parseShopFilters(await searchParams), category: category.slug };
  return (
    <>
      <PageHero eyebrow="Flavour" title={category.name} sub={category.description ?? undefined} />
      <Suspense fallback={<ProductGridSkeleton />}><CatalogView filters={filters} basePath={`/categories/${category.slug}`} fixedCategory /></Suspense>
    </>
  );
}
