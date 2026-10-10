import { AdminHeader, Panel, Pill } from "@/components/admin/admin-ui";
import { CategoryForm } from "@/components/admin/misc-forms";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requirePermission("categories:write");
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <>
      <AdminHeader title="Categories" sub="Categories group products on the storefront. A category that has products is deactivated rather than deleted." />
      <div className="space-y-6">
        <Panel title="New category"><CategoryForm /></Panel>
        {categories.map((c) => (
          <Panel key={c.id}>
            <div className="mb-3 flex items-center gap-3"><h2 className="font-serif text-2xl">{c.name}</h2><Pill tone={c.isActive ? "green" : "grey"}>{c.isActive ? "Visible" : "Hidden"}</Pill><span className="text-xs text-muted">{c._count.products} product(s)</span></div>
            <CategoryForm category={c} />
          </Panel>
        ))}
      </div>
    </>
  );
}
