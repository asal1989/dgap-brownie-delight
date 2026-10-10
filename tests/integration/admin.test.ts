import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { actorFromUser } from "@/lib/audit";
import { advanceFulfillment, markCodPaid, refundOrder, saveAdminNote } from "@/lib/order-admin";
import { placeOrder, simulateDevPayment, startOnlinePayment } from "@/lib/orders";
import { processNotifications } from "@/lib/notify";
import { cartOf, checkout, makeUser, resetDb, seedCatalog, stockOf, type Fixture } from "../helpers/fixtures";
import { randomUUID } from "node:crypto";

let f: Fixture;
let actor: ReturnType<typeof actorFromUser>;
beforeEach(async () => {
  await resetDb();
  f = await seedCatalog();
  actor = actorFromUser(await makeUser("ADMIN"));
});

async function paidOrder(qty = 1) {
  const placed = await placeOrder({ cart: cartOf(f.fudgyV.id, qty), checkout: checkout(), user: null });
  await startOnlinePayment(placed.orderNumber);
  await simulateDevPayment(placed.orderNumber, "success");
  return placed;
}
const reload = (id: string) => db.order.findUniqueOrThrow({ where: { id }, include: { history: { orderBy: { createdAt: "asc" } }, refunds: true } });

describe("fulfilment lifecycle", () => {
  it("walks the full path, recording actor, from, to, note and a timestamp each time", async () => {
    const o = await paidOrder();
    const steps = ["PREPARING", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
    for (const to of steps) await advanceFulfillment({ orderId: o.id, to, note: `note ${to}`, actor });
    const done = await reload(o.id);
    expect(done.fulfillmentStatus).toBe("DELIVERED");
    const adminRows = done.history.filter((h) => h.actorId === actor.id);
    expect(adminRows.map((h) => [h.fromStatus, h.toStatus, h.note])).toEqual([
      ["CONFIRMED", "PREPARING", "note PREPARING"],
      ["PREPARING", "READY_FOR_DISPATCH", "note READY_FOR_DISPATCH"],
      ["READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "note OUT_FOR_DELIVERY"],
      ["OUT_FOR_DELIVERY", "DELIVERED", "note DELIVERED"],
    ]);
    expect(adminRows.every((h) => h.createdAt instanceof Date && h.actorLabel.includes("ADMIN User"))).toBe(true);
    expect(await db.auditLog.count({ where: { action: "order.status.update" } })).toBe(4);
  });

  it("rejects invalid transitions and leaves the order untouched", async () => {
    const o = await paidOrder();
    await expect(advanceFulfillment({ orderId: o.id, to: "DELIVERED", actor })).rejects.toMatchObject({ code: "STATE" });
    await expect(advanceFulfillment({ orderId: o.id, to: "CONFIRMED", actor })).rejects.toMatchObject({ code: "STATE" });
    expect((await reload(o.id)).fulfillmentStatus).toBe("CONFIRMED");
  });

  it("will not progress an unpaid online order", async () => {
    const placed = await placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout(), user: null });
    await expect(advanceFulfillment({ orderId: placed.id, to: "CONFIRMED", actor })).rejects.toMatchObject({ code: "STATE" });
  });

  it("serialises two admins updating the same order at once: exactly one wins", async () => {
    const o = await paidOrder();
    const results = await Promise.allSettled([
      advanceFulfillment({ orderId: o.id, to: "PREPARING", actor }),
      advanceFulfillment({ orderId: o.id, to: "PREPARING", actor }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await reload(o.id)).history.filter((h) => h.toStatus === "PREPARING")).toHaveLength(1);
  });

  it("queues a customer notification for each change and never sends without a provider", async () => {
    const o = await paidOrder();
    await advanceFulfillment({ orderId: o.id, to: "PREPARING", actor });
    const queued = await db.notification.findMany({ where: { orderId: o.id } });
    expect(queued.map((n) => n.type).sort()).toEqual(["order.placed", "order.status", "payment.confirmed"]);
    const r = await processNotifications();
    expect(r).toMatchObject({ sent: 0, skipped: 3 });
    expect((await db.notification.findMany()).every((n) => n.status === "SKIPPED")).toBe(true);
  });

  it("stores an internal note that customers never see", async () => {
    const o = await paidOrder();
    await saveAdminNote({ orderId: o.id, note: "Call before delivery", actor });
    const row = (await reload(o.id)).history.at(-1)!;
    expect(row).toMatchObject({ kind: "NOTE", customerVisible: false });
  });
});

describe("cancellation", () => {
  it("cancels, restocks, and does NOT refund automatically", async () => {
    const o = await paidOrder(2);
    expect(await stockOf(f.fudgyV.id)).toBe(8);
    await advanceFulfillment({ orderId: o.id, to: "CANCELLED", note: "Customer request", actor });
    const c = await reload(o.id);
    expect(c).toMatchObject({ fulfillmentStatus: "CANCELLED", paymentStatus: "PAID" });
    expect(c.refunds).toHaveLength(0);
    expect(await stockOf(f.fudgyV.id)).toBe(10);
    await expect(advanceFulfillment({ orderId: o.id, to: "PREPARING", actor })).rejects.toMatchObject({ code: "STATE" });
  });

  it("cannot cancel a delivered order", async () => {
    const o = await paidOrder();
    for (const to of ["PREPARING", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERED"] as const) await advanceFulfillment({ orderId: o.id, to, actor });
    await expect(advanceFulfillment({ orderId: o.id, to: "CANCELLED", actor })).rejects.toMatchObject({ code: "STATE" });
  });
});

describe("refunds", () => {
  const refund = (orderId: string, amountPaise: number, key: string = randomUUID()) =>
    refundOrder({ orderId, amountPaise, reason: "Customer request", idempotencyKey: key, actor });

  it("refunds partially, then fully, tracking payment status each step", async () => {
    const o = await paidOrder(); // total 1,050
    const r1 = await refund(o.id, 20_000);
    expect(r1.status).toBe("PROCESSED");
    expect((await reload(o.id)).paymentStatus).toBe("PARTIALLY_REFUNDED");
    await refund(o.id, 85_000);
    expect((await reload(o.id)).paymentStatus).toBe("REFUNDED");
  });

  it("never refunds more than was paid", async () => {
    const o = await paidOrder();
    await expect(refund(o.id, 105_001)).rejects.toMatchObject({ code: "STATE" });
    await refund(o.id, 100_000);
    await expect(refund(o.id, 6_000)).rejects.toMatchObject({ code: "STATE" });
    await expect(refund(o.id, 0)).rejects.toMatchObject({ code: "STATE" });
  });

  it("is idempotent: a double-submitted refund is created once", async () => {
    const o = await paidOrder();
    const key = "refund-key-1";
    const [a, b] = await Promise.all([refund(o.id, 30_000, key), refund(o.id, 30_000, key)]);
    expect(a.refundId).toBe(b.refundId);
    expect((await reload(o.id)).refunds).toHaveLength(1);
  });

  it("only paid orders can be refunded", async () => {
    const placed = await placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout(), user: null });
    await expect(refund(placed.id, 1_000)).rejects.toMatchObject({ code: "STATE" });
  });

  it("writes an audit trail and queues a refund notification", async () => {
    const o = await paidOrder();
    await refund(o.id, 10_000);
    expect(await db.auditLog.count({ where: { action: "order.refund.request" } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "order.refund.settled" } })).toBe(1);
    expect(await db.notification.count({ where: { type: "refund.update" } })).toBe(1);
  });
});

describe("cash on delivery", () => {
  it("moves through delivery and is marked paid only when cash is collected", async () => {
    const placed = await placeOrder({ cart: cartOf(f.fudgyV.id), checkout: checkout({ paymentMethod: "COD" }), user: null });
    for (const to of ["PREPARING", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY"] as const) await advanceFulfillment({ orderId: placed.id, to, actor });
    expect((await reload(placed.id)).paymentStatus).toBe("PENDING");
    await advanceFulfillment({ orderId: placed.id, to: "DELIVERED", cashCollected: true, actor });
    const o = await reload(placed.id);
    expect(o).toMatchObject({ fulfillmentStatus: "DELIVERED", paymentStatus: "PAID" });
    await expect(markCodPaid({ orderId: placed.id, actor })).rejects.toMatchObject({ code: "STATE" });
  });
});
