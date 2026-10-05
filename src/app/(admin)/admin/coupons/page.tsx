import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle, EmptyRow, TableWrap, td, th } from "@/components/admin/bits";
import { AdminForm } from "@/components/admin/admin-form";
import { ACheck, AField, Panel, adminInput } from "@/components/admin/fields";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteCoupon, saveCoupon } from "@/actions/admin";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCoupons({ searchParams }: { searchParams: Promise<{ saved?: string; edit?: string }> }) {
  const { saved, edit } = await searchParams;
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const c = edit ? coupons.find((x) => x.id === edit) : undefined;
  const k = c?.id ?? "new";
  return (
    <>
      <AdminTitle title="Coupons" saved={!!saved} />
      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <TableWrap>
          <thead><tr><th className={th}>Code</th><th className={th}>Discount</th><th className={th}>Used</th><th className={th}>Expires</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {coupons.length === 0 ? <EmptyRow cols={6} text="No coupons yet." /> : null}
            {coupons.map((x) => (
              <tr key={x.id}>
                <td className={`${td} font-mono font-semibold`}>{x.code}</td>
                <td className={td}>{x.discountType === "PERCENTAGE" ? `${x.discountValue}%` : formatINR(x.discountValue)}{x.minimumOrder ? <span className="block text-xs text-fg/70">min {formatINR(x.minimumOrder)}</span> : null}</td>
                <td className={td}>{x.usedCount}{x.usageLimit ? ` / ${x.usageLimit}` : ""}</td>
                <td className={td}>{x.expiresAt ? x.expiresAt.toLocaleDateString("en-IN") : "Never"}</td>
                <td className={td}>{x.isActive ? "Active" : "Off"}</td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <a href={`/admin/coupons?edit=${x.id}`} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-panel2/60">Edit</a>{" "}
                  <form action={deleteCoupon} className="inline"><input type="hidden" name="id" value={x.id} /><ConfirmButton message={`Delete coupon ${x.code}?`} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-danger hover:bg-panel2/60">Delete</ConfirmButton></form>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Panel title={c ? `Edit ${c.code}` : "New coupon"}>
          <AdminForm key={k} action={saveCoupon} submitLabel={c ? "Save coupon" : "Create coupon"}>
            {c ? <input type="hidden" name="id" value={c.id} /> : null}
            <AField id={`code-${k}`} label="Code"><input id={`code-${k}`} name="code" required defaultValue={c?.code} className={`${adminInput} uppercase`} /></AField>
            <div className="grid grid-cols-2 gap-3">
              <AField id={`type-${k}`} label="Type"><select id={`type-${k}`} name="discountType" defaultValue={c?.discountType ?? "PERCENTAGE"} className={adminInput}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed (₹)</option></select></AField>
              <AField id={`val-${k}`} label="Value"><input id={`val-${k}`} name="discountValue" type="number" min={1} required defaultValue={c?.discountValue} className={adminInput} /></AField>
              <AField id={`min-${k}`} label="Minimum order (₹)"><input id={`min-${k}`} name="minimumOrder" type="number" min={0} defaultValue={c?.minimumOrder ?? 0} className={adminInput} /></AField>
              <AField id={`max-${k}`} label="Max discount (₹)"><input id={`max-${k}`} name="maximumDiscount" type="number" min={1} defaultValue={c?.maximumDiscount ?? ""} className={adminInput} /></AField>
              <AField id={`lim-${k}`} label="Usage limit"><input id={`lim-${k}`} name="usageLimit" type="number" min={1} defaultValue={c?.usageLimit ?? ""} className={adminInput} /></AField>
              <AField id={`exp-${k}`} label="Expires on"><input id={`exp-${k}`} name="expiresAt" type="date" defaultValue={c?.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : ""} className={adminInput} /></AField>
            </div>
            <ACheck name="isActive" label="Active" defaultChecked={c ? c.isActive : true} />
          </AdminForm>
          {c ? <a href="/admin/coupons" className="mt-3 inline-block text-sm text-caramel underline">Cancel editing</a> : null}
        </Panel>
      </div>
    </>
  );
}
