import { AdminHeader, Panel } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-forms";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requirePermission("products:write");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <AdminHeader title="New product" sub="Create the product first, then add sizes, prices and photos on the next screen." />
      <Panel><ProductForm creating categories={categories} /></Panel>
    </>
  );
}
