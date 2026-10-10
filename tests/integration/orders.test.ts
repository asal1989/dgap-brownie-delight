import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { OrderError, placeOrder } from "@/lib/orders";
import { quoteCart } from "@/lib/quote";
import { getSettings, saveSettings } from "@/lib/settings";
import { cartOf, checkout, makeUser, resetDb, seedCatalog, stockOf, type Fixture } from "../helpers/fixtures";

let f: Fixture;
beforeEach(async () => {
  await resetDb();
  f = await seedCatalog();
});

describe("placeOrder", () => {
  it("computes every amount on the server and snapshots the items", async () => {
    // The browser can only send ids/quantities; extra price fields are ignored by the schema.
    const cart = { items: [{ type: "product" as const, variantId: f.fudgyV.id, quantity: 2, unitPricePaise: 1 }] };
    const placed = await placeOrder({ cart, checkout: checkout(), user: null });
    const order = await db.order.findUniqueOrThrow({ where: { id: placed.id }, include: { items: true, history: true } });

    expect(order.subtotalPaise).toBe(200_000);
    expect(order.shippingPaise).toBe(5_000);
    expect(order.totalPaise).toBe(205_000);
    expect(order.paymentStatus).toBe("PENDING");
    expect(order.fulfillmentStatus).toBe("PENDING_PAYMENT");
    expect(order.isTest).toBe(true); // development payment mode
    expect(order.orderNumber).toMatch(/^DGAP-\d+$/);
    expect(order.items[0]).toMatchObject({ productName: "Classic Fudgy Brownie", unitPricePaise: 100_000, quantity: 2, lineTotalPaise: 200_000 });
    expect(order.history).toHaveLength(1);
    expect(await stockOf(f.fudgyV.id)).toBe(8);
  });

  it("keeps historical orders unchanged when product name or price later changes", async () => {
    const placed = await placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout(), user: null });
    await db.product.update({ where: { id: f.fudgy.id }, data: { name: "Renamed" } });
    await db.productVariant.update({ where: { id: f.fudgyV.id }, data: { priceInPaise: 999_999 } });
    const item = await db.orderItem.findFirstOrThrow({ where: { orderId: placed.id } });
    expect(item.productName).toBe("Classic Fudgy Brownie");
    expect(item.unitPricePaise).toBe(100_000);
  });

  it("is idempotent: submitting the same key twice returns one order and decrements stock once", async () => {
    const key = "idem-key-123456";
    const [a, b] = await Promise.all([
      placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout({ idempotencyKey: key }), user: null }),
      placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout({ idempotencyKey: key }), user: null }),
    ]);
    expect(a.orderNumber).toBe(b.orderNumber);
    expect(await db.order.count()).toBe(1);
    expect(await stockOf(f.fudgyV.id)).toBe(9);
  });

  it("refuses to sell when ordering is closed", async () => {
    await saveSettings({ orderingEnabled: false }, null);
    await expect(placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout(), user: null })).rejects.toMatchObject({ code: "CLOSED" });
  });

  it("will not sell a variant without a configured price", async () => {
    await expect(placeOrder({ cart: cartOf(f.unpricedV.id), checkout: checkout(), user: null })).rejects.toBeInstanceOf(OrderError);
    expect(await db.order.count()).toBe(0);
  });

  it("validates delivery against configured zones", async () => {
    await saveSettings({ restrictToZones: true, deliveryZones: [{ id: "blr", name: "Bengaluru", postalPrefixes: ["560"], feePaise: 3_000 }] }, null);
    await expect(placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout({ postalCode: "110001" }), user: null })).rejects.toBeInstanceOf(OrderError);
    const ok = await placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout({ postalCode: "560034" }), user: null });
    expect((await db.order.findUniqueOrThrow({ where: { id: ok.id } })).shippingPaise).toBe(3_000);
  });

  it("creates a confirmed COD order only when COD is enabled", async () => {
    const cod = await placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout({ paymentMethod: "COD" }), user: null });
    const order = await db.order.findUniqueOrThrow({ where: { id: cod.id } });
    expect(order).toMatchObject({ paymentMethod: "COD", fulfillmentStatus: "CONFIRMED", paymentStatus: "PENDING", isTest: false });

    await saveSettings({ codEnabled: false }, null);
    await expect(placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout({ paymentMethod: "COD" }), user: null })).rejects.toMatchObject({ code: "PAYMENT_UNAVAILABLE" });
  });
});

describe("inventory under concurrency", () => {
  it("never oversells: 10 parallel buyers for 3 units yield exactly 3 orders and stock 0", async () => {
    await db.productVariant.update({ where: { id: f.fudgyV.id }, data: { stockQuantity: 3 } });
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout(), user: null })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(await stockOf(f.fudgyV.id)).toBe(0);
    expect(await db.order.count()).toBe(3);
    const moves = await db.inventoryMovement.findMany({ where: { variantId: f.fudgyV.id } });
    expect(moves.reduce((s, m) => s + m.delta, 0)).toBe(-3);
  });

  it("rejects a quantity above current stock with a clear message", async () => {
    const q = await quoteCart(db, cartOf(f.fudgyV.id, 11), { settings: await getSettings() });
    expect(q.valid).toBe(false);
    expect(q.issues[0]).toMatch(/Only 10 .* left in stock/);
  });

  it("does not track stock for variants with inventory tracking off", async () => {
    await db.productVariant.update({ where: { id: f.fudgyV.id }, data: { trackInventory: false, stockQuantity: 0 } });
    await placeOrder({ cart: cartOf(f.fudgyV.id, 5), checkout: checkout(), user: null });
    expect(await stockOf(f.fudgyV.id)).toBe(0);
  });
});

describe("coupons", () => {
  const mk = (over: object = {}) =>
    db.coupon.create({ data: { code: "SAVE10", type: "PERCENT", value: 10, ...over } });

  it("applies the discount, counts the redemption and records it on the order", async () => {
    const c = await mk();
    const placed = await placeOrder({ cart: cartOf(f.fudgyV.id, 1, "save10"), checkout: checkout(), user: null });
    const order = await db.order.findUniqueOrThrow({ where: { id: placed.id }, include: { redemption: true } });
    expect(order.discountPaise).toBe(10_000);
    expect(order.totalPaise).toBe(100_000 - 10_000 + 5_000);
    expect(order.couponCode).toBe("SAVE10");
    expect(order.redemption?.amountPaise).toBe(10_000);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: c.id } })).usedCount).toBe(1);
  });

  it("enforces a usage limit under concurrency", async () => {
    await mk({ usageLimit: 1 });
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => placeOrder({ cart: cartOf(f.fudgyV.id, 1, "SAVE10"), checkout: checkout(), user: null })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.coupon.findFirstOrThrow()).usedCount).toBe(1);
  });

  it("enforces a per-customer limit", async () => {
    await mk({ perCustomerLimit: 1 });
    const user = await makeUser();
    await placeOrder({ cart: cartOf(f.fudgyV.id, 1, "SAVE10"), checkout: checkout(), user });
    await expect(placeOrder({ cart: cartOf(f.fudgyV.id, 1, "SAVE10"), checkout: checkout(), user })).rejects.toMatchObject({ code: "COUPON" });
  });

  it("rejects expired coupons and coupons below the minimum", async () => {
    await mk({ expiresAt: new Date(Date.now() - 1000) });
    await expect(placeOrder({ cart: cartOf(f.fudgyV.id, 1, "SAVE10"), checkout: checkout(), user: null })).rejects.toMatchObject({ code: "COUPON" });
    await db.coupon.deleteMany();
    await mk({ minOrderPaise: 500_000 });
    await expect(placeOrder({ cart: cartOf(f.fudgyV.id, 1, "SAVE10"), checkout: checkout(), user: null })).rejects.toMatchObject({ code: "COUPON" });
  });

  it("only discounts eligible products", async () => {
    await mk({ productIds: [f.walnut.id] });
    const cart = { items: [{ type: "product" as const, variantId: f.fudgyV.id, quantity: 1 }, { type: "product" as const, variantId: f.walnutV.id, quantity: 1 }], couponCode: "SAVE10" };
    const q = await quoteCart(db, cart, { settings: await getSettings() });
    expect(q.pricing.discountPaise).toBe(6_000);
  });
});

describe("custom box", () => {
  const box = (selections: { productId: string; quantity: number }[], quantity = 1) => ({
    items: [{ type: "box" as const, variantId: f.boxV.id, quantity, selections }],
  });

  it("prices the box from the configured size and snapshots its contents", async () => {
    const placed = await placeOrder({
      cart: box([{ productId: f.fudgy.id, quantity: 3 }, { productId: f.walnut.id, quantity: 1 }]),
      checkout: checkout(),
      user: null,
    });
    const item = await db.orderItem.findFirstOrThrow({ where: { orderId: placed.id } });
    expect(item.unitPricePaise).toBe(40_000);
    expect(item.selections).toEqual([
      { productId: f.fudgy.id, name: "Classic Fudgy Brownie", quantity: 3 },
      { productId: f.walnut.id, name: "Chocolate Walnut Brownie", quantity: 1 },
    ]);
  });

  it("rejects a composition that does not fill the box", async () => {
    const q = await quoteCart(db, box([{ productId: f.fudgy.id, quantity: 3 }]), { settings: await getSettings() });
    expect(q.valid).toBe(false);
    expect(q.issues[0]).toMatch(/exactly 4/);
  });

  it("rejects flavours that are not selectable, inactive or unknown", async () => {
    await db.product.update({ where: { id: f.walnut.id }, data: { boxSelectable: false } });
    const q1 = await quoteCart(db, box([{ productId: f.fudgy.id, quantity: 2 }, { productId: f.walnut.id, quantity: 2 }]), { settings: await getSettings() });
    expect(q1.valid).toBe(false);
    const q2 = await quoteCart(db, box([{ productId: "nope", quantity: 4 }]), { settings: await getSettings() });
    expect(q2.valid).toBe(false);
  });

  it("will not let a standard product be bought as a box (or a box as a standard item)", async () => {
    const asBox = await quoteCart(db, { items: [{ type: "box", variantId: f.fudgyV.id, quantity: 1, selections: [{ productId: f.fudgy.id, quantity: 4 }] }] }, { settings: await getSettings() });
    expect(asBox.valid).toBe(false);
    const asProduct = await quoteCart(db, cartOf(f.boxV.id), { settings: await getSettings() });
    expect(asProduct.valid).toBe(false);
  });

  it("decrements the box stock by the number of boxes", async () => {
    await placeOrder({ cart: box([{ productId: f.fudgy.id, quantity: 4 }], 2), checkout: checkout(), user: null });
    expect(await stockOf(f.boxV.id)).toBe(3);
  });
});
