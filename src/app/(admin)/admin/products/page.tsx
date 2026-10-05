import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { AdminLink, AdminTitle, EmptyRow, TableWrap, td, th } from "@/components/admin/bits";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { SmartImage } from "@/components/ui/smart-image";
import { deleteProduct, toggleProduct } from "@/actions/admin";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string }> }) {
  const { q, saved } = await searchParams;
  const products = await prisma.product.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : undefined,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
  const btn = "rounded-full border border-beige px-3 py-1.5 text-xs font-semibold hover:bg-beige/60";
  return (
    <>
      <AdminTitle title="Products" saved={!!saved} action={<AdminLink href="/admin/products/new"><Plus className="size-4" aria-hidden />New product</AdminLink>} />
      <form className="mb-4" role="search">
        <input name="q" defaultValue={q} placeholder="Search name or SKU…" aria-label="Search products" className="h-11 w-full max-w-sm rounded-full border border-beige bg-white px-5 text-sm outline-none focus:border-caramel" />
      </form>
      <TableWrap>
        <thead>
          <tr><th className={th}>Product</th><th className={th}>Category</th><th className={th}>Price</th><th className={th}>Stock</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>
          {products.length === 0 ? <EmptyRow cols={6} text="No products yet." /> : null}
          {products.map((p) => (
            <tr key={p.id}>
              <td className={td}>
                <div className="flex items-center gap-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-beige"><SmartImage src={p.images[0]} alt="" fill sizes="48px" className="object-cover" /></span>
                  <div>
                    <Link href={`/admin/products/${p.id}`} className="font-semibold text-choc hover:underline">{p.name}</Link>
                    <p className="text-xs text-ink/70">{p.sku ?? "no SKU"}{p.isSample ? " · sample" : ""}</p>
                  </div>
                </div>
              </td>
              <td className={td}>{p.category.name}</td>
              <td className={td}>{formatINR(p.price)}{p.compareAtPrice ? <span className="ml-1 text-xs text-ink/40 line-through">{formatINR(p.compareAtPrice)}</span> : null}</td>
              <td className={td}><span className={p.stock === 0 ? "font-bold text-danger" : ""}>{p.stock}</span></td>
              <td className={td}>
                <span className={p.isActive ? "text-success" : "text-ink/70"}>{p.isActive ? "Active" : "Hidden"}</span>
                {p.isBestSeller ? <span className="ml-2 text-xs text-caramel">★ best</span> : null}
              </td>
              <td className={`${td} whitespace-nowrap text-right`}>
                <form action={toggleProduct} className="inline"><input type="hidden" name="id" value={p.id} /><button className={btn}>{p.isActive ? "Hide" : "Show"}</button></form>{" "}
                <Link href={`/admin/products/${p.id}`} className={btn}>Edit</Link>{" "}
                <form action={deleteProduct} className="inline"><input type="hidden" name="id" value={p.id} /><ConfirmButton message={`Delete "${p.name}"? This cannot be undone.`} className={`${btn} text-danger`}>Delete</ConfirmButton></form>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
