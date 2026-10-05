import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle } from "@/components/admin/bits";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProduct() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <AdminTitle title="New product" />
      {categories.length === 0 ? <p className="rounded-xl bg-amber-100 p-4 text-sm">Create a category first.</p> : <ProductForm categories={categories} />}
    </>
  );
}
