import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { actorFromUser } from "@/lib/audit";
import { dashboardStats, resolvePeriod, salesByDay } from "@/lib/analytics";
import { adjustStock, createProduct, createVariant, StockError, updateVariant, productInputSchema, removeOrArchiveProduct } from "@/lib/product-admin";
import { advanceFulfillment, refundOrder } from "@/lib/order-admin";
import { placeOrder, simulateDevPayment, startOnlinePayment } from "@/lib/orders";
import { cartOf, checkout, makeUser, resetDb, seedCatalog, type Fixture } from "../helpers/fixtures";

let f: Fixture;
let actor: ReturnType<typeof actorFromUser>;
beforeEach(async () => {
  await resetDb();
  f = await seedCatalog();
  actor = actorFromUser(await makeUser("ADMIN"));
});

async function paid(qty = 1, code?: string) {
  const placed = await placeOrder({ cart: cartOf(f.fudgyV.id, qty, code), checkout: checkout(), user: null });
  await startOnlinePayment(placed.orderNumber);
  await simulateDevPayment(placed.orderNumber, "success");
  return placed;
}

describe("dashboard metrics come from real records", () => {
  it("is all zeros with no data (nothing fabricated)", async () => {
    const s = await dashboardStats(resolvePeriod("all"), true);
    expect(s).toMatchObject({ totalOrders: 0, ordersToday: 0, grossSalesPaise: 0, refundsPaise: 0, netSalesPaise: 0, averageOrderValuePaise: 0, completed: 0, cancelled: 0 });
    expect(s.bestsellers).toEqual([]);
    expect(s.recent).toEqual([]);
  });

  it("computes gross, discounts, refunds, net and average order value exactly", async () => {
    await db.coupon.create({ data: { code: "SAVE10", type: "PERCENT", value: 10 } });
    const a = await paid(1, "SAVE10"); // 1000 - 100 + 50 delivery = 950, discount 100
    const b = await paid(2); //           2000 + 50 = 2050
    await refundOrder({ orderId: a.id, amountPaise: 20_000, reason: "test", idempotencyKey: "k-analytics-1", actor });
    await placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout(), user: null }); // unpaid: must not count as sales

    const s = await dashboardStats(resolvePeriod("all"), true);
    expect(s.totalOrders).toBe(3);
    expect(s.paidOrders).toBe(2);
    expect(s.grossSalesPaise).toBe(95_000 + 205_000);
    expect(s.discountsPaise).toBe(10_000);
    expect(s.refundsPaise).toBe(20_000);
    expect(s.netSalesPaise).toBe(300_000 - 20_000);
    expect(s.averageOrderValuePaise).toBe(150_000);
    expect(s.pending).toBe(1);
    expect(s.confirmed).toBe(2);
    expect(s.bestsellers[0]).toMatchObject({ name: "Classic Fudgy Brownie", units: 3 });
    expect(b.orderNumber).toBeTruthy();
  });

  it("excludes test orders unless asked, and reports pipeline counts", async () => {
    const o = await paid();
    await advanceFulfillment({ orderId: o.id, to: "PREPARING", actor });
    expect((await dashboardStats(resolvePeriod("all"), false)).totalOrders).toBe(0); // dev-mode orders are flagged as test
    const s = await dashboardStats(resolvePeriod("all"), true);
    expect(s.preparing).toBe(1);
    expect(s.confirmed).toBe(0);
  });

  it("reports low stock and sales by day", async () => {
    await db.productVariant.update({ where: { id: f.fudgyV.id }, data: { stockQuantity: 3, lowStockThreshold: 5 } });
    await paid();
    const s = await dashboardStats(resolvePeriod("all"), true);
    expect(s.lowStock.map((v) => v.sku)).toContain("T-FUDGY-1KG");
    const days = await salesByDay(resolvePeriod("30d"), true);
    expect(days).toHaveLength(1);
    expect(days[0].grossPaise).toBe(105_000);
  });
});

describe("catalogue administration", () => {
  const input = productInputSchema.parse({ name: "New Brownie", shortDescription: "A short description", description: "A full description", status: "ACTIVE" });

  it("creates products with unique slugs and recomputes the minimum price from variants", async () => {
    const p1 = await createProduct(input, actor);
    const p2 = await createProduct(input, actor);
    expect([p1.slug, p2.slug]).toEqual(["new-brownie", "new-brownie-2"]);

    const base = { weightGrams: null, pieces: null, compareAtPriceInPaise: null, stockQuantity: 4, trackInventory: true, lowStockThreshold: 5, isAvailable: true, sortOrder: 0 };
    await createVariant(p1.id, { ...base, label: "A", sku: "NB-A", priceInPaise: 30_000 }, actor);
    const vb = await createVariant(p1.id, { ...base, label: "B", sku: "NB-B", priceInPaise: 20_000 }, actor);
    expect((await db.product.findUniqueOrThrow({ where: { id: p1.id } })).minPricePaise).toBe(20_000);
    await updateVariant(vb.id, { ...base, label: "B", sku: "NB-B", priceInPaise: 40_000 }, actor);
    expect((await db.product.findUniqueOrThrow({ where: { id: p1.id } })).minPricePaise).toBe(30_000);
    // Opening stock was recorded as a movement.
    expect(await db.inventoryMovement.count({ where: { reason: "INITIAL" } })).toBe(2);
  });

  it("rejects a compare-at price that is not higher than the price", async () => {
    const p = await createProduct(input, actor);
    await expect(createVariant(p.id, { label: "X", sku: "NB-X", weightGrams: null, pieces: null, priceInPaise: 100, compareAtPriceInPaise: 100, stockQuantity: 0, trackInventory: true, lowStockThreshold: 5, isAvailable: true, sortOrder: 0 }, actor)).rejects.toThrow(/Compare-at/);
  });

  it("records every stock adjustment and refuses to go below zero", async () => {
    const r = await adjustStock({ variantId: f.fudgyV.id, mode: "delta", amount: -4, reason: "DAMAGE", note: "dropped", actor });
    expect(r).toEqual({ before: 10, after: 6 });
    await adjustStock({ variantId: f.fudgyV.id, mode: "set", amount: 20, reason: "CORRECTION", actor });
    await expect(adjustStock({ variantId: f.fudgyV.id, mode: "delta", amount: -21, reason: "ADJUSTMENT", actor })).rejects.toBeInstanceOf(StockError);
    const moves = await db.inventoryMovement.findMany({ where: { variantId: f.fudgyV.id }, orderBy: { createdAt: "asc" } });
    expect(moves.map((m) => [m.delta, m.quantityAfter, m.reason])).toEqual([[-4, 6, "DAMAGE"], [14, 20, "CORRECTION"]]);
    expect(moves[0].actorId).toBe(actor.id);
  });

  it("serialises concurrent stock adjustments", async () => {
    await Promise.all(Array.from({ length: 8 }, () => adjustStock({ variantId: f.fudgyV.id, mode: "delta", amount: -1, reason: "ADJUSTMENT", actor })));
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: f.fudgyV.id } })).stockQuantity).toBe(2);
  });

  it("archives products with order history instead of deleting them", async () => {
    await paid();
    expect(await removeOrArchiveProduct(f.fudgy.id, actor)).toBe("archived");
    expect((await db.product.findUniqueOrThrow({ where: { id: f.fudgy.id } })).status).toBe("ARCHIVED");
    expect(await db.orderItem.count({ where: { productName: "Classic Fudgy Brownie" } })).toBe(1);
    const fresh = await createProduct(input, actor);
    expect(await removeOrArchiveProduct(fresh.id, actor)).toBe("deleted");
  });

  it("archived products can no longer be bought", async () => {
    await removeOrArchiveProduct(f.walnut.id, actor);
    await expect(placeOrder({ cart: cartOf(f.walnutV.id), checkout: checkout(), user: null })).rejects.toBeInstanceOf(Error);
  });
});
