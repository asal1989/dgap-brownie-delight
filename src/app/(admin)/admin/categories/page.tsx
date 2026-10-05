import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle, EmptyRow, TableWrap, td, th } from "@/components/admin/bits";
import { AdminForm } from "@/components/admin/admin-form";
import { ACheck, AField, Panel, adminInput } from "@/components/admin/fields";
import { ImageField } from "@/components/admin/image-field";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteCategory, saveCategory } from "@/actions/admin";
import type { Category } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Categories" };

function CategoryForm({ c }: { c?: Category }) {
  return (
    <AdminForm action={saveCategory} submitLabel={c ? "Save category" : "Add category"}>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <AField id={`name-${c?.id ?? "new"}`} label="Name"><input id={`name-${c?.id ?? "new"}`} name="name" required defaultValue={c?.name} className={adminInput} /></AField>
        <AField id={`slug-${c?.id ?? "new"}`} label="URL slug" hint="Blank = from name"><input id={`slug-${c?.id ?? "new"}`} name="slug" defaultValue={c?.slug} className={adminInput} /></AField>
        <AField id={`desc-${c?.id ?? "new"}`} label="Short label" className="sm:col-span-2"><input id={`desc-${c?.id ?? "new"}`} name="description" maxLength={300} defaultValue={c?.description ?? ""} className={adminInput} /></AField>
        <AField id="image" label="Image" className="sm:col-span-2"><ImageField name="image" label="Category image" multiple={false} defaultValue={c?.image ?? ""} /></AField>
        <AField id={`sort-${c?.id ?? "new"}`} label="Sort order"><input id={`sort-${c?.id ?? "new"}`} name="sortOrder" type="number" min={0} defaultValue={c?.sortOrder ?? 0} className={adminInput} /></AField>
        <div className="flex items-end"><ACheck name="isActive" label="Active" defaultChecked={c ? c.isActive : true} /></div>
      </div>
    </AdminForm>
  );
}

export default async function AdminCategories({ searchParams }: { searchParams: Promise<{ saved?: string; edit?: string }> }) {
  const { saved, edit } = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  const editing = edit ? categories.find((c) => c.id === edit) : undefined;
  return (
    <>
      <AdminTitle title="Categories" saved={!!saved} />
      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <TableWrap>
          <thead><tr><th className={th}>Name</th><th className={th}>Products</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {categories.length === 0 ? <EmptyRow cols={4} text="No categories yet." /> : null}
            {categories.map((c) => (
              <tr key={c.id}>
                <td className={td}><span className="font-semibold text-choc">{c.name}</span><p className="text-xs text-ink/50">/{c.slug}</p></td>
                <td className={td}>{c._count.products}</td>
                <td className={td}>{c.isActive ? "Active" : "Hidden"}</td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <a href={`/admin/categories?edit=${c.id}`} className="rounded-full border border-beige px-3 py-1.5 text-xs font-semibold hover:bg-beige/60">Edit</a>{" "}
                  {c._count.products === 0 ? (
                    <form action={deleteCategory} className="inline"><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Delete "${c.name}"?`} className="rounded-full border border-beige px-3 py-1.5 text-xs font-semibold text-danger hover:bg-beige/60">Delete</ConfirmButton></form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Panel title={editing ? `Edit ${editing.name}` : "Add category"}>
          <CategoryForm key={editing?.id ?? "new"} c={editing} />
          {editing ? <a href="/admin/categories" className="mt-3 inline-block text-sm text-caramel underline">Cancel editing</a> : null}
        </Panel>
      </div>
    </>
  );
}
