"use client";

import Image from "next/image";
import {
  archiveVariantAction, createVariantAction, deleteImageAction, makePrimaryImageAction, removeProductAction,
  updateProductAction, updateVariantAction, uploadImageAction, createProductAction,
} from "@/actions/admin/catalog";
import { ActionForm } from "@/components/ui/auth-form";
import { paiseToRupeesInput } from "@/lib/money";

type Category = { id: string; name: string };
type ProductData = {
  id?: string; name: string; slug: string; shortDescription: string; description: string; categoryId: string | null;
  kind: "STANDARD" | "CUSTOM_BOX"; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; ingredients: string | null; allergens: string | null;
  dietaryLabels: string[]; isFeatured: boolean; isBestseller: boolean; boxSelectable: boolean; seoTitle: string | null; seoDescription: string | null; sortOrder: number;
};

const Check = ({ name, label, checked }: { name: string; label: string; checked?: boolean }) => (
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={checked} className="accent-forest" /> {label}</label>
);

export function ProductForm({ product, categories, creating = false }: { product?: ProductData; categories: Category[]; creating?: boolean }) {
  const p = product;
  return (
    <ActionForm action={creating ? createProductAction : updateProductAction} submitLabel={creating ? "Create product" : "Save product"} pendingLabel="Saving…" submitClass="btn btn-primary" hidden={p?.id ? { productId: p.id } : undefined}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="field"><span className="label">Name</span><input name="name" className="input" required defaultValue={p?.name} maxLength={120} data-testid="product-name" /></label>
        <label className="field"><span className="label">URL slug <span className="font-normal text-muted">(auto from name if empty)</span></span><input name="slug" className="input" defaultValue={p?.slug} maxLength={80} /></label>
      </div>
      <label className="field"><span className="label">Short description</span><input name="shortDescription" className="input" required defaultValue={p?.shortDescription} maxLength={240} /></label>
      <label className="field"><span className="label">Full description</span><textarea name="description" className="textarea" rows={5} required defaultValue={p?.description} maxLength={5000} /></label>
      <div className="grid gap-5 md:grid-cols-3">
        <label className="field"><span className="label">Category</span>
          <select name="categoryId" className="select" defaultValue={p?.categoryId ?? ""}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </label>
        <label className="field"><span className="label">Type</span>
          <select name="kind" className="select" defaultValue={p?.kind ?? "STANDARD"}><option value="STANDARD">Standard product</option><option value="CUSTOM_BOX">Custom box (size options)</option></select>
        </label>
        <label className="field"><span className="label">Status</span>
          <select name="status" className="select" defaultValue={p?.status ?? "DRAFT"}><option value="DRAFT">Draft (hidden)</option><option value="ACTIVE">Active (visible)</option><option value="ARCHIVED">Archived</option></select>
        </label>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="field"><span className="label">Ingredients <span className="font-normal text-muted">(only once verified)</span></span><textarea name="ingredients" className="textarea" rows={3} defaultValue={p?.ingredients ?? ""} maxLength={2000} /></label>
        <label className="field"><span className="label">Allergen information <span className="font-normal text-muted">(only once verified)</span></span><textarea name="allergens" className="textarea" rows={3} defaultValue={p?.allergens ?? ""} maxLength={1000} /></label>
      </div>
      <label className="field"><span className="label">Dietary labels <span className="font-normal text-muted">(comma separated; only add verified labels)</span></span><input name="dietaryLabels" className="input" defaultValue={p?.dietaryLabels.join(", ")} placeholder="Contains nuts" /></label>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Check name="isFeatured" label="Featured (signature brownie)" checked={p?.isFeatured} />
        <Check name="isBestseller" label="Bestseller" checked={p?.isBestseller} />
        <Check name="boxSelectable" label="Can be chosen in custom boxes" checked={p?.boxSelectable} />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <label className="field"><span className="label">SEO title</span><input name="seoTitle" className="input" defaultValue={p?.seoTitle ?? ""} maxLength={70} /></label>
        <label className="field md:col-span-2"><span className="label">SEO description</span><input name="seoDescription" className="input" defaultValue={p?.seoDescription ?? ""} maxLength={170} /></label>
        <label className="field"><span className="label">Sort order</span><input name="sortOrder" type="number" min={0} className="input" defaultValue={p?.sortOrder ?? 0} /></label>
      </div>
    </ActionForm>
  );
}

type VariantData = {
  id: string; label: string; sku: string; weightGrams: number | null; pieces: number | null; priceInPaise: number | null; compareAtPriceInPaise: number | null;
  stockQuantity: number; trackInventory: boolean; lowStockThreshold: number; isAvailable: boolean; sortOrder: number;
};

function VariantFields({ v, creating }: { v?: VariantData; creating?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="field"><span className="label">Label (size / weight)</span><input name="label" className="input" required defaultValue={v?.label} placeholder="1 kg" data-testid="variant-label" /></label>
      <label className="field"><span className="label">SKU</span><input name="sku" className="input" required defaultValue={v?.sku} data-testid="variant-sku" /></label>
      <label className="field"><span className="label">Price (₹)</span><input name="price" className="input" inputMode="decimal" defaultValue={paiseToRupeesInput(v?.priceInPaise)} placeholder="Not set" data-testid="variant-price" /></label>
      <label className="field"><span className="label">Compare-at (₹)</span><input name="compareAt" className="input" inputMode="decimal" defaultValue={paiseToRupeesInput(v?.compareAtPriceInPaise)} /></label>
      <label className="field"><span className="label">Weight (g)</span><input name="weightGrams" type="number" min={1} className="input" defaultValue={v?.weightGrams ?? ""} /></label>
      <label className="field"><span className="label">Pieces in box</span><input name="pieces" type="number" min={1} className="input" defaultValue={v?.pieces ?? ""} /></label>
      {creating ? (
        <label className="field"><span className="label">Opening stock</span><input name="stockQuantity" type="number" min={0} className="input" defaultValue={0} /></label>
      ) : (
        <p className="field"><span className="label">Stock</span><span className="block py-2.5 text-sm">{v?.stockQuantity} <span className="text-muted">(change in Inventory)</span></span></p>
      )}
      <label className="field"><span className="label">Low-stock alert at</span><input name="lowStockThreshold" type="number" min={0} className="input" defaultValue={v?.lowStockThreshold ?? 5} /></label>
      <label className="field"><span className="label">Sort order</span><input name="sortOrder" type="number" min={0} className="input" defaultValue={v?.sortOrder ?? 0} /></label>
      <div className="flex flex-col justify-end gap-2 pb-2">
        <Check name="trackInventory" label="Track stock" checked={v?.trackInventory ?? true} />
        <Check name="isAvailable" label="Available to buy" checked={v?.isAvailable ?? true} />
      </div>
    </div>
  );
}

export function VariantRow({ productId, variant }: { productId: string; variant: VariantData }) {
  return (
    <div className="border border-line bg-ivory p-5" data-testid="variant-row">
      <ActionForm action={updateVariantAction} submitLabel="Save variant" pendingLabel="Saving…" submitClass="btn btn-primary btn-sm" hidden={{ variantId: variant.id, productId }}>
        <VariantFields v={variant} />
      </ActionForm>
      <ActionForm action={archiveVariantAction} submitLabel="Archive variant" submitClass="btn btn-outline btn-sm mt-3" hidden={{ variantId: variant.id, productId }} className="!space-y-0">
        <span className="sr-only">Archiving hides this variant but keeps it on past orders.</span>
      </ActionForm>
    </div>
  );
}

export function NewVariantForm({ productId }: { productId: string }) {
  return (
    <ActionForm action={createVariantAction} submitLabel="Add variant" pendingLabel="Adding…" submitClass="btn btn-primary btn-sm" hidden={{ productId }}>
      <VariantFields creating />
    </ActionForm>
  );
}

export function ImageManager({ productId, images }: { productId: string; images: { id: string; url: string; alt: string }[] }) {
  return (
    <div>
      {images.length > 0 && (
        <ul className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((im, i) => (
            <li key={im.id} className="border border-line bg-ivory p-3">
              <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep"><Image src={im.url} alt={im.alt} fill sizes="240px" className="object-cover" /></div>
              <p className="mt-2 text-xs text-muted">{i === 0 ? "Primary photo · " : ""}{im.alt}</p>
              <div className="mt-2 flex gap-2">
                {i !== 0 && <ActionForm action={makePrimaryImageAction} submitLabel="Make primary" submitClass="btn btn-outline btn-sm" hidden={{ imageId: im.id, productId }} className="!space-y-0"><span className="sr-only">Make primary</span></ActionForm>}
                <ActionForm action={deleteImageAction} submitLabel="Remove" submitClass="btn btn-outline btn-sm" hidden={{ imageId: im.id, productId }} className="!space-y-0"><span className="sr-only">Remove photo</span></ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={uploadImageAction} submitLabel="Upload photo" pendingLabel="Uploading…" submitClass="btn btn-primary btn-sm" hidden={{ productId }}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="field"><span className="label">Photo (JPEG, PNG or WebP, up to 5 MB)</span><input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className="input !py-2" /></label>
          <label className="field"><span className="label">Description of the photo (alt text)</span><input name="alt" className="input" required minLength={3} maxLength={160} placeholder="Stack of fudgy chocolate brownies" /></label>
        </div>
      </ActionForm>
    </div>
  );
}

export function DangerZone({ productId, hasHistory }: { productId: string; hasHistory: boolean }) {
  return (
    <ActionForm action={removeProductAction} submitLabel={hasHistory ? "Archive product" : "Delete product"} submitClass="btn btn-danger btn-sm" hidden={{ productId }}>
      <p className="text-sm text-muted">{hasHistory ? "This product appears on past orders, so it will be archived (hidden) rather than deleted. Order history is never changed." : "This product has no orders, so it will be permanently deleted."}</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" required className="accent-danger" /> I understand.</label>
    </ActionForm>
  );
}
