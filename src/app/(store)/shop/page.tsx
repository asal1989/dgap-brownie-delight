import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/store/skeletons";
import { CatalogView } from "@/components/store/catalog-view";
import { PageHero } from "@/components/ui/section";
import { parseShopFilters } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop all brownies",
  description: "Browse every DGAP brownie: Classic Fudgy, Double and Triple Chocolate, Walnut, Ragi and Wheat brownies, boxes and gifts.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const filters = parseShopFilters(await searchParams);
  return (
    <>
      <PageHero eyebrow="The collection" title="Shop all brownies" sub="Handcrafted in small batches. Choose a flavour, pick a size and order." />
      <Suspense fallback={<ProductGridSkeleton />}><CatalogView filters={filters} basePath="/shop" /></Suspense>
    </>
  );
}
