import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/admin-ui";
import { DangerZone, ImageManager, NewVariantForm, ProductForm, VariantRow } from "@/components/admin/product-forms";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const user = await requirePermission("products:read");
  const { id } = await params;
  const [product, categories, orderCount] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, variants: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } } } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.orderItem.count({ where: { productId: id } }),
  ]);
  if (!product) notFound();
  const write = can(user.role, "products:write");

  if (!write) {
    return (
      <>
        <AdminHeader title={product.name} sub="You can view this product but not edit it." />
        <Panel><p className="text-sm text-muted">{product.shortDescription}</p></Panel>
      </>
    );
  }

  return (
    <>
      <AdminHeader title={product.name} sub={<>Status: <strong>{product.status}</strong> · <Link href={`/shop/${product.slug}`} className="underline">view on storefront</Link></>} actions={<Link href="/admin/products" className="btn btn-outline btn-sm">← All products</Link>} />
      <div className="space-y-8">
        <Panel title="Details"><ProductForm product={{ ...product, id: product.id }} categories={categories} /></Panel>
        <Panel title="Variants and pricing">
          <p className="mb-5 text-sm text-muted">Enter prices in rupees. Leave the price empty if it is not confirmed: the variant then cannot be bought and customers are told to enquire. Stock changes are recorded in Inventory.</p>
          <div className="space-y-5">{product.variants.map((v) => <VariantRow key={v.id} productId={product.id} variant={v} />)}</div>
          <div className="mt-8 border-t border-line pt-6"><h3 className="mb-4 font-serif text-2xl">Add a variant</h3><NewVariantForm productId={product.id} /></div>
        </Panel>
        <Panel title="Photos"><ImageManager productId={product.id} images={product.images} /></Panel>
        <Panel title="Remove product"><DangerZone productId={product.id} hasHistory={orderCount > 0} /></Panel>
      </div>
    </>
  );
}
