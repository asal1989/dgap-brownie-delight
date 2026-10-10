import { AdminHeader, Panel, dateTime } from "@/components/admin/admin-ui";
import { StockForm } from "@/components/admin/misc-forms";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  await requirePermission("inventory:write");
  const [variants, movements] = await Promise.all([
    db.productVariant.findMany({ where: { archivedAt: null, product: { status: { not: "ARCHIVED" } } }, include: { product: { select: { name: true } } }, orderBy: [{ product: { sortOrder: "asc" } }, { sortOrder: "asc" }] }),
    db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { variant: { include: { product: { select: { name: true } } } }, actor: { select: { name: true } } } }),
  ]);
  return (
    <>
      <AdminHeader title="Inventory" sub="Every change is recorded with a reason, who made it and the resulting stock. Stock can never go below zero, and checkout reserves stock so items cannot be oversold." />
      <div className="table-wrap mb-10 border border-line bg-white">
        <table className="table" data-testid="inventory-table">
          <thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Stock</th><th>Adjust</th></tr></thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} data-sku={v.sku}>
                <td>{v.product.name}</td><td>{v.label}</td><td className="text-xs text-muted">{v.sku}</td>
                <td>{v.trackInventory ? <span className={v.stockQuantity <= v.lowStockThreshold ? "font-semibold text-danger" : ""} data-testid="stock-value">{v.stockQuantity}</span> : <span className="text-muted">not tracked</span>}</td>
                <td className="min-w-[24rem]">{v.trackInventory ? <StockForm variantId={v.id} /> : <span className="text-xs text-muted">Turn on stock tracking in the product to manage stock.</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Panel title="Recent stock movements">
        {movements.length === 0 ? <p className="text-sm text-muted">No movements yet.</p> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>When</th><th>Item</th><th>Change</th><th>Stock after</th><th>Reason</th><th>By</th></tr></thead>
            <tbody>{movements.map((m) => <tr key={m.id}><td className="whitespace-nowrap">{dateTime(m.createdAt)}</td><td>{m.variant.product.name} ({m.variant.label})</td><td className={m.delta < 0 ? "text-danger" : "text-success"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td><td>{m.quantityAfter}</td><td>{m.reason}{m.note ? ` · ${m.note}` : ""}</td><td>{m.actor?.name ?? (m.orderId ? "Order" : "System")}</td></tr>)}</tbody></table></div>
        )}
      </Panel>
    </>
  );
}
