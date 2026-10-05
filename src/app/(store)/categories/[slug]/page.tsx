import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/shop/catalog";
import { PageHeader } from "@/components/layout/page-header";
import { getCategoryBySlug } from "@/lib/db/queries";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryBySlug(slug);
  if (!c) return { title: "Category not found" };
  return {
    title: `${c.name} Brownies`,
    description: c.description ?? `Shop ${c.name} brownies, freshly baked and delivered.`,
    alternates: { canonical: `/categories/${c.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  return (
    <>
      <PageHeader
        title={`${category.name} Brownies`}
        subtitle={category.description ?? undefined}
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: category.name }]}
      />
      <div className="container-page py-10 lg:py-14">
        <Catalog sp={sp} basePath={`/categories/${category.slug}`} fixedCategory={category.slug} />
      </div>
    </>
  );
}
