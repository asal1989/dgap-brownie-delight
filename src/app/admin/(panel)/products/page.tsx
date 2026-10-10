import Image from "next/image";
import Link from "next/link";
import { AdminHeader, Pill } from "@/components/admin/admin-ui";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const user = await requirePermission("products:read");
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const q = one("q")?.trim().slice(0, 80);
  const status = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(one("status") ?? "") ? (one("status") as "DRAFT" | "ACTIVE" | "ARCHIVED") : undefined;
  const products = await db.product.findMany({
    where: { ...(status ? { status } : {}), ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { where: { archivedAt: null } } },
  });
  const removed = one("removed");

  return (
    <>
      <AdminHeader title="Products" sub="Prices are stored as integer paise and shown in rupees. A variant without a price cannot be sold." actions={can(user.role, "products:write") ? <Link href="/admin/products/new" className="btn btn-primary btn-sm">New product</Link> : undefined} />
      {removed && <p role="status" className="mb-6 border-l-[3px] border-gold bg-white px-4 py-3 text-sm">Product {removed === "deleted" ? "deleted" : "archived (it has order history)"}.</p>}
      <form method="get" className="mb-6 flex flex-wrap gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="Search products" className="input max-w-xs" aria-label="Search products" />
        <select name="status" defaultValue={status ?? ""} className="select max-w-[11rem]" aria-label="Status"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
        <button className="btn btn-outline btn-sm" type="submit">Filter</button>
      </form>
      <div className="table-wrap border border-line bg-white">
        <table className="table" data-testid="products-table">
          <thead><tr><th>Product</th><th>Category</th><th>Status</th><th>Variants</th><th>From</th><th>Stock</th></tr></thead>
          <tbody>
            {products.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted">No products found.</td></tr>}
            {products.map((p) => {
              const stock = p.variants.filter((v) => v.trackInventory).reduce((s, v) => s + v.stockQuantity, 0);
              const tracked = p.variants.some((v) => v.trackInventory);
              return (
                <tr key={p.id}>
                  <td><div className="flex items-center gap-3"><span className="relative block size-12 shrink-0 overflow-hidden bg-ivory-deep">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="48px" className="object-cover" />}</span>
                    <Link href={`/admin/products/${p.id}`} className="font-semibold text-forest underline">{p.name}</Link></div></td>
                  <td>{p.category?.name ?? "—"}</td>
                  <td><Pill tone={p.status === "ACTIVE" ? "green" : p.status === "DRAFT" ? "gold" : "grey"}>{p.status}</Pill></td>
                  <td>{p.variants.length}{p.variants.some((v) => v.priceInPaise == null) && <span className="ml-1 text-xs text-danger" title="Some variants have no price">unpriced</span>}</td>
                  <td>{p.minPricePaise != null ? formatINR(p.minPricePaise) : "—"}</td>
                  <td>{tracked ? stock : "not tracked"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
