import { AdminForm } from "@/components/admin/admin-form";
import { ACheck, AField, Panel, adminInput } from "@/components/admin/fields";
import { ImageField } from "@/components/admin/image-field";
import { saveProduct } from "@/actions/admin";
import type { Product } from "@/generated/prisma/client";

export function ProductForm({ product, categories }: { product?: Product; categories: { id: string; name: string }[] }) {
  const p = product;
  return (
    <AdminForm action={saveProduct} submitLabel={p ? "Save product" : "Create product"}>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <AField id="name" label="Name"><input id="name" name="name" required defaultValue={p?.name} className={adminInput} /></AField>
              <AField id="slug" label="URL slug" hint="Leave blank to generate from the name."><input id="slug" name="slug" defaultValue={p?.slug} className={adminInput} /></AField>
              <AField id="categoryId" label="Category">
                <select id="categoryId" name="categoryId" required defaultValue={p?.categoryId ?? ""} className={adminInput}>
                  <option value="" disabled>Select…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </AField>
              <AField id="sku" label="SKU"><input id="sku" name="sku" defaultValue={p?.sku ?? ""} className={adminInput} /></AField>
            </div>
            <AField id="shortDescription" label="Short description" hint="Shown on product cards." className="mt-4"><input id="shortDescription" name="shortDescription" maxLength={200} defaultValue={p?.shortDescription ?? ""} className={adminInput} /></AField>
            <AField id="description" label="Full description" className="mt-4"><textarea id="description" name="description" required rows={5} defaultValue={p?.description} className={adminInput} /></AField>
          </Panel>

          <Panel title="Product information">
            <p className="mb-4 text-sm text-ink/70">Only filled-in sections appear on the product page. Write only what is true for this product.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <AField id="ingredients" label="Ingredients"><textarea id="ingredients" name="ingredients" rows={3} defaultValue={p?.ingredients ?? ""} className={adminInput} /></AField>
              <AField id="allergens" label="Allergen information"><textarea id="allergens" name="allergens" rows={3} defaultValue={p?.allergens ?? ""} className={adminInput} /></AField>
              <AField id="storage" label="Storage instructions"><textarea id="storage" name="storage" rows={3} defaultValue={p?.storage ?? ""} className={adminInput} /></AField>
              <AField id="deliveryInfo" label="Delivery notes" hint="Falls back to your global delivery settings."><textarea id="deliveryInfo" name="deliveryInfo" rows={3} defaultValue={p?.deliveryInfo ?? ""} className={adminInput} /></AField>
            </div>
          </Panel>

          <Panel title="Photos">
            <ImageField name="images" label="Product images" defaultValue={(p?.images ?? []).join("\n")} />
            <p className="mt-2 text-xs text-ink/70">First image is the main photo. Use real DGAP photography. Square or 4:5 crops look best.</p>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Pricing & stock">
            <div className="space-y-4">
              <AField id="price" label="Selling price (₹)"><input id="price" name="price" type="number" min={1} step={1} required defaultValue={p?.price} className={adminInput} /></AField>
              <AField id="compareAtPrice" label="Original price (₹)" hint="Set higher than the selling price to show a discount."><input id="compareAtPrice" name="compareAtPrice" type="number" min={1} step={1} defaultValue={p?.compareAtPrice ?? ""} className={adminInput} /></AField>
              <AField id="stock" label="Stock"><input id="stock" name="stock" type="number" min={0} step={1} required defaultValue={p?.stock ?? 0} className={adminInput} /></AField>
            </div>
          </Panel>
          <Panel title="Visibility">
            <ACheck name="isActive" label="Active (visible in shop)" defaultChecked={p ? p.isActive : true} />
            <ACheck name="isBestSeller" label="Best seller" defaultChecked={p?.isBestSeller} />
            <ACheck name="isFeatured" label="Featured" defaultChecked={p?.isFeatured} />
            <ACheck name="isGiftBox" label="Gift box" defaultChecked={p?.isGiftBox} />
            <ACheck name="isBoxEligible" label="Available in Build-Your-Box" defaultChecked={p ? p.isBoxEligible : true} />
            <ACheck name="isSample" label="Sample / demo product" defaultChecked={p?.isSample} />
          </Panel>
        </div>
      </div>
    </AdminForm>
  );
}
