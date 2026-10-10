"use client";

import { adjustStockAction, deleteCategoryAction, saveCategoryAction } from "@/actions/admin/catalog";
import { moderateReviewAction, saveCouponAction, saveCustomerNoteAction, toggleCouponAction } from "@/actions/admin/misc";
import { ActionForm } from "@/components/ui/auth-form";
import { paiseToRupeesInput } from "@/lib/money";

export function CategoryForm({ category }: { category?: { id: string; name: string; slug: string; description: string | null; sortOrder: number; isActive: boolean } }) {
  return (
    <div>
      <ActionForm action={saveCategoryAction} submitLabel={category ? "Save" : "Create category"} pendingLabel="Saving…" submitClass="btn btn-primary btn-sm" hidden={category ? { categoryId: category.id } : undefined}>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="field"><span className="label">Name</span><input name="name" className="input" required defaultValue={category?.name} maxLength={80} data-testid="category-name" /></label>
          <label className="field"><span className="label">Slug</span><input name="slug" className="input" defaultValue={category?.slug} maxLength={80} placeholder="auto" /></label>
          <label className="field md:col-span-2"><span className="label">Description</span><input name="description" className="input" defaultValue={category?.description ?? ""} maxLength={300} /></label>
          <label className="field"><span className="label">Sort</span><input name="sortOrder" type="number" min={0} className="input" defaultValue={category?.sortOrder ?? 0} /></label>
          <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" name="isActive" defaultChecked={category?.isActive ?? true} className="accent-forest" /> Visible</label>
        </div>
      </ActionForm>
      {category && (
        <ActionForm action={deleteCategoryAction} submitLabel="Delete / deactivate" submitClass="btn btn-outline btn-sm mt-2" hidden={{ categoryId: category.id }} className="!space-y-0"><span className="sr-only">Delete category</span></ActionForm>
      )}
    </div>
  );
}

export function StockForm({ variantId }: { variantId: string }) {
  return (
    <ActionForm action={adjustStockAction} submitLabel="Apply" pendingLabel="…" submitClass="btn btn-primary btn-sm" hidden={{ variantId }} className="!space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <select name="mode" className="select !min-h-[38px] !w-auto" aria-label="Adjustment type" defaultValue="add"><option value="add">Add</option><option value="remove">Remove</option><option value="set">Set to</option></select>
        <input name="amount" type="number" min={0} required className="input !min-h-[38px] !w-20" aria-label="Quantity" defaultValue={1} data-testid="stock-amount" />
        <select name="reason" className="select !min-h-[38px] !w-auto" aria-label="Reason" defaultValue="RESTOCK"><option value="RESTOCK">Restock</option><option value="ADJUSTMENT">Adjustment</option><option value="CORRECTION">Count correction</option><option value="DAMAGE">Damaged / wasted</option></select>
        <input name="note" className="input !min-h-[38px] !w-40" placeholder="Note (optional)" aria-label="Note" maxLength={200} />
      </div>
    </ActionForm>
  );
}

type CouponData = {
  id: string; code: string; description: string | null; type: "PERCENT" | "FIXED"; value: number; maxDiscountPaise: number | null; minOrderPaise: number;
  startsAt: Date | null; expiresAt: Date | null; usageLimit: number | null; perCustomerLimit: number | null; isActive: boolean; productIds: string[]; categoryIds: string[];
};

const istLocal = (d: Date | null) => {
  if (!d) return "";
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return ist.toISOString().slice(0, 16);
};

export function CouponForm({ coupon, products, categories }: { coupon?: CouponData; products: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveCouponAction} submitLabel={coupon ? "Save coupon" : "Create coupon"} pendingLabel="Saving…" submitClass="btn btn-primary btn-sm" hidden={coupon ? { couponId: coupon.id } : undefined}>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="field"><span className="label">Code</span><input name="code" className="input uppercase" required defaultValue={coupon?.code} maxLength={30} data-testid="coupon-code" /></label>
        <label className="field"><span className="label">Type</span><select name="type" className="select" defaultValue={coupon?.type ?? "PERCENT"} data-testid="coupon-type"><option value="PERCENT">Percentage off</option><option value="FIXED">Fixed amount off</option></select></label>
        <label className="field"><span className="label">Value (% or ₹)</span><input name="value" className="input" required inputMode="decimal" defaultValue={coupon ? (coupon.type === "PERCENT" ? String(coupon.value) : paiseToRupeesInput(coupon.value)) : ""} data-testid="coupon-value" /></label>
        <label className="field"><span className="label">Max discount (₹, % only)</span><input name="maxDiscount" className="input" inputMode="decimal" defaultValue={paiseToRupeesInput(coupon?.maxDiscountPaise)} /></label>
        <label className="field"><span className="label">Minimum order (₹)</span><input name="minOrder" className="input" inputMode="decimal" defaultValue={paiseToRupeesInput(coupon?.minOrderPaise || null)} /></label>
        <label className="field"><span className="label">Starts (IST)</span><input name="startsAt" type="datetime-local" className="input" defaultValue={istLocal(coupon?.startsAt ?? null)} /></label>
        <label className="field"><span className="label">Expires (IST)</span><input name="expiresAt" type="datetime-local" className="input" defaultValue={istLocal(coupon?.expiresAt ?? null)} /></label>
        <label className="field"><span className="label">Total uses</span><input name="usageLimit" type="number" min={1} className="input" defaultValue={coupon?.usageLimit ?? ""} placeholder="Unlimited" /></label>
        <label className="field"><span className="label">Uses per customer</span><input name="perCustomerLimit" type="number" min={1} className="input" defaultValue={coupon?.perCustomerLimit ?? ""} placeholder="Unlimited" /></label>
        <label className="field md:col-span-3"><span className="label">Description (internal)</span><input name="description" className="input" defaultValue={coupon?.description ?? ""} maxLength={200} /></label>
        <label className="field md:col-span-2"><span className="label">Only these products <span className="font-normal text-muted">(hold Ctrl/Cmd; none = all)</span></span>
          <select name="productIds" multiple size={4} className="select" defaultValue={coupon?.productIds ?? []}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="field md:col-span-2"><span className="label">Only these categories</span>
          <select name="categoryIds" multiple size={4} className="select" defaultValue={coupon?.categoryIds ?? []}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={coupon?.isActive ?? true} className="accent-forest" /> Active</label>
      </div>
    </ActionForm>
  );
}

export function ToggleCoupon({ id, active }: { id: string; active: boolean }) {
  return <ActionForm action={toggleCouponAction} submitLabel={active ? "Deactivate" : "Activate"} submitClass="btn btn-outline btn-sm" hidden={{ couponId: id }} className="!space-y-0"><span className="sr-only">Toggle</span></ActionForm>;
}

export function ReviewActions({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "APPROVED" && <ActionForm action={moderateReviewAction} submitLabel="Approve" submitClass="btn btn-primary btn-sm" hidden={{ reviewId: id, decision: "APPROVED" }} className="!space-y-0"><span className="sr-only">Approve</span></ActionForm>}
      {status !== "REJECTED" && <ActionForm action={moderateReviewAction} submitLabel="Reject" submitClass="btn btn-outline btn-sm" hidden={{ reviewId: id, decision: "REJECTED" }} className="!space-y-0"><span className="sr-only">Reject</span></ActionForm>}
      <ActionForm action={moderateReviewAction} submitLabel="Delete" submitClass="btn btn-outline btn-sm" hidden={{ reviewId: id, decision: "DELETE" }} className="!space-y-0"><span className="sr-only">Delete</span></ActionForm>
    </div>
  );
}

export function CustomerNoteForm({ userId, note }: { userId: string; note: string }) {
  return (
    <ActionForm action={saveCustomerNoteAction} submitLabel="Save note" submitClass="btn btn-primary btn-sm" hidden={{ userId }}>
      <label className="field"><span className="sr-only">Internal note</span><textarea name="note" className="textarea" rows={4} defaultValue={note} maxLength={2000} placeholder="Visible to admins only" /></label>
    </ActionForm>
  );
}
