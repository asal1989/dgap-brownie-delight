import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle } from "@/components/admin/bits";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();
  return (
    <>
      <AdminTitle title={`Edit: ${product.name}`} />
      <ProductForm product={product} categories={categories} />
    </>
  );
}
