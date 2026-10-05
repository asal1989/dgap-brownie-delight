import type { Metadata } from "next";
import { Catalog } from "@/components/shop/catalog";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Shop Premium Brownies",
  description: "Browse fresh chocolate brownies, flavoured brownies and brownie gift boxes. Order online for delivery.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader
        title="Shop Brownies"
        subtitle="Rich, fudgy and made for your sweetest moments."
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      />
      <div className="container-page py-10 lg:py-14">
        <Catalog sp={sp} basePath="/shop" />
      </div>
    </>
  );
}
