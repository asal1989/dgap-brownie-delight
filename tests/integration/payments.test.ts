import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applyPaymentCaptured, applyPaymentFailed, cancelOrderTx, expireUnpaidOrders, placeOrder, simulateDevPayment, startOnlinePayment } from "@/lib/orders";
import { handleRazorpayWebhook } from "@/lib/payments/webhook";
import { SYSTEM_ACTOR } from "@/lib/audit";
import { cartOf, checkout, resetDb, seedCatalog, stockOf, type Fixture } from "../helpers/fixtures";

let f: Fixture;
beforeEach(async () => {
  await resetDb();
  f = await seedCatalog();
});

const order = (qty = 1) => placeOrder({ cart: cartOf(f.fudgyV.id, qty), checkout: checkout(), user: null });
const reload = (id: string) => db.order.findUniqueOrThrow({ where: { id }, include: { history: { orderBy: { createdAt: "asc" } }, payments: true } });

describe("development payment flow", () => {
  it("marks an order paid and confirmed only after the server records a capture", async () => {
    const placed = await order();
    expect((await reload(placed.id)).paymentStatus).toBe("PENDING");

    const start = await startOnlinePayment(placed.orderNumber);
    expect(start.mode).toBe("dev");
    expect(start.amountPaise).toBe(105_000);
    expect((await reload(placed.id)).paymentStatus).toBe("PENDING"); // starting a payment is not paying

    await simulateDevPayment(placed.orderNumber, "success");
    const o = await reload(placed.id);
    expect(o).toMatchObject({ paymentStatus: "PAID", fulfillmentStatus: "CONFIRMED" });
    expect(o.paidAt).not.toBeNull();
    expect(o.payments[0]).toMatchObject({ provider: "DEV", status: "CAPTURED" });
    expect(o.history.map((h) => `${h.kind}:${h.toStatus}`)).toEqual(["FULFILLMENT:PENDING_PAYMENT", "PAYMENT:PAID", "FULFILLMENT:CONFIRMED"]);
    expect((await db.product.findUniqueOrThrow({ where: { id: f.fudgy.id } })).soldCount).toBe(1);
  });

  it("reuses the open payment attempt when the customer retries or refreshes", async () => {
    const placed = await order();
    const a = await startOnlinePayment(placed.orderNumber);
    const b = await startOnlinePayment(placed.orderNumber);
    expect(a).toEqual(b);
    expect(await db.payment.count()).toBe(1);
  });

  it("handles a failed payment, then a successful retry", async () => {
    const placed = await order();
    await startOnlinePayment(placed.orderNumber);
    await simulateDevPayment(placed.orderNumber, "failure");
    expect((await reload(placed.id))).toMatchObject({ paymentStatus: "FAILED", fulfillmentStatus: "PENDING_PAYMENT" });

    await startOnlinePayment(placed.orderNumber);
    expect((await reload(placed.id)).paymentStatus).toBe("PENDING");
    await simulateDevPayment(placed.orderNumber, "success");
    expect((await reload(placed.id))).toMatchObject({ paymentStatus: "PAID", fulfillmentStatus: "CONFIRMED" });
    expect(await db.payment.count()).toBe(2);
  });

  it("applying the same capture twice (webhook + callback race) pays once", async () => {
    const placed = await order();
    const s = await startOnlinePayment(placed.orderNumber);
    if (s.mode !== "dev") throw new Error("expected dev");
    const args = { providerOrderId: s.devOrderId, providerPaymentId: "dev_pay_x", amountPaise: s.amountPaise, currency: "INR", actorLabel: "test" };
    const results = await Promise.all([applyPaymentCaptured(args), applyPaymentCaptured(args), applyPaymentCaptured(args)]);
    expect(results.filter((r) => r.status === "applied")).toHaveLength(1);
    expect(results.filter((r) => r.status === "already")).toHaveLength(2);
    expect((await db.product.findUniqueOrThrow({ where: { id: f.fudgy.id } })).soldCount).toBe(1);
    expect(await db.notification.count({ where: { type: "payment.confirmed" } })).toBe(1);
  });

  it("rejects a payment whose amount does not match the order and does not mark it paid", async () => {
    const placed = await order();
    const s = await startOnlinePayment(placed.orderNumber);
    if (s.mode !== "dev") throw new Error("expected dev");
    const r = await applyPaymentCaptured({ providerOrderId: s.devOrderId, providerPaymentId: "p", amountPaise: 100, currency: "INR", actorLabel: "test" });
    expect(r.status).toBe("mismatch");
    expect((await reload(placed.id)).paymentStatus).toBe("PENDING");
    const wrongCurrency = await applyPaymentCaptured({ providerOrderId: s.devOrderId, providerPaymentId: "p2", amountPaise: s.amountPaise, currency: "USD", actorLabel: "test" });
    expect(wrongCurrency.status).toBe("mismatch");
  });

  it("flags money received after an order was cancelled, without un-cancelling it", async () => {
    const placed = await order();
    const s = await startOnlinePayment(placed.orderNumber);
    if (s.mode !== "dev") throw new Error("expected dev");
    await db.$transaction((tx) => cancelOrderTx(tx, placed.id, SYSTEM_ACTOR, "test"));
    await applyPaymentCaptured({ providerOrderId: s.devOrderId, providerPaymentId: "late", amountPaise: s.amountPaise, currency: "INR", actorLabel: "test" });
    const o = await reload(placed.id);
    expect(o).toMatchObject({ fulfillmentStatus: "CANCELLED", paymentStatus: "PAID" });
    expect(o.history.at(-1)?.note).toMatch(/Refund required/);
  });

  it("is not available at all when dev mode is switched off", async () => {
    const placed = await order();
    process.env.PAYMENT_MODE = "off";
    const { env } = await import("@/lib/env");
    (env() as { PAYMENT_MODE?: string }).PAYMENT_MODE = "off";
    await expect(startOnlinePayment(placed.orderNumber)).rejects.toMatchObject({ code: "PAYMENT_UNAVAILABLE" });
    await expect(simulateDevPayment(placed.orderNumber, "success")).rejects.toMatchObject({ code: "PAYMENT_UNAVAILABLE" });
    process.env.PAYMENT_MODE = "dev";
    (env() as { PAYMENT_MODE?: string }).PAYMENT_MODE = "dev";
  });
});

describe("cancellation, expiry and stock", () => {
  it("returns stock and the coupon use when an unpaid order is cancelled", async () => {
    await db.coupon.create({ data: { code: "SAVE10", type: "PERCENT", value: 10 } });
    const placed = await placeOrder({ cart: cartOf(f.fudgyV.id, 2, "SAVE10"), checkout: checkout(), user: null });
    expect(await stockOf(f.fudgyV.id)).toBe(8);
    await db.$transaction((tx) => cancelOrderTx(tx, placed.id, SYSTEM_ACTOR, "changed mind"));
    expect(await stockOf(f.fudgyV.id)).toBe(10);
    expect((await db.coupon.findFirstOrThrow()).usedCount).toBe(0);
    expect(await db.couponRedemption.count()).toBe(0);
    // Cancelling again must not restock twice.
    await db.$transaction((tx) => cancelOrderTx(tx, placed.id, SYSTEM_ACTOR, "again"));
    expect(await stockOf(f.fudgyV.id)).toBe(10);
  });

  it("expires stale unpaid online orders but never paid ones", async () => {
    const stale = await order();
    const paid = await order();
    await startOnlinePayment(paid.orderNumber);
    await simulateDevPayment(paid.orderNumber, "success");
    await db.order.updateMany({ data: { placedAt: new Date(Date.now() - 3 * 3600_000) } });
    expect(await expireUnpaidOrders(60)).toBe(1);
    expect((await reload(stale.id)).fulfillmentStatus).toBe("CANCELLED");
    expect((await reload(paid.id)).fulfillmentStatus).toBe("CONFIRMED");
    expect(await stockOf(f.fudgyV.id)).toBe(9);
  });
});

describe("razorpay webhook", () => {
  const secret = "whsec_test_value";
  const sign = (body: string) => createHmac("sha256", secret).update(body).digest("hex");
  const capturedBody = (providerOrderId: string, amount: number, id = "pay_abc") =>
    JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id, order_id: providerOrderId, amount, currency: "INR", method: "upi", status: "captured" } } } });

  async function pendingRazorpayOrder() {
    const placed = await order();
    // Simulate a Razorpay attempt row (no network): same shape startOnlinePayment would create.
    await db.order.update({ where: { id: placed.id }, data: { paymentMethod: "RAZORPAY", isTest: false } });
    await db.payment.create({ data: { orderId: placed.id, provider: "RAZORPAY", providerOrderId: "order_RZP1", amountPaise: 105_000 } });
    return placed;
  }

  it("rejects missing, wrong and tampered signatures without touching the order", async () => {
    const placed = await pendingRazorpayOrder();
    const body = capturedBody("order_RZP1", 105_000);
    expect((await handleRazorpayWebhook({ rawBody: body, signature: null, eventId: "e1", secret })).status).toBe(401);
    expect((await handleRazorpayWebhook({ rawBody: body, signature: "deadbeef", eventId: "e1", secret })).status).toBe(401);
    expect((await handleRazorpayWebhook({ rawBody: body + " ", signature: sign(body), eventId: "e1", secret })).status).toBe(401);
    expect((await handleRazorpayWebhook({ rawBody: body, signature: sign(body), eventId: "e1", secret: undefined })).status).toBe(503);
    expect((await reload(placed.id)).paymentStatus).toBe("PENDING");
    expect(await db.webhookEvent.count()).toBe(0);
  });

  it("marks the order paid on a valid captured event", async () => {
    const placed = await pendingRazorpayOrder();
    const body = capturedBody("order_RZP1", 105_000);
    const res = await handleRazorpayWebhook({ rawBody: body, signature: sign(body), eventId: "evt_1", secret });
    expect(res.status).toBe(200);
    expect(await reload(placed.id)).toMatchObject({ paymentStatus: "PAID", fulfillmentStatus: "CONFIRMED" });
  });

  it("processes a re-delivered event only once (idempotent)", async () => {
    const placed = await pendingRazorpayOrder();
    const body = capturedBody("order_RZP1", 105_000);
    const args = { rawBody: body, signature: sign(body), eventId: "evt_dup", secret };
    const first = await handleRazorpayWebhook(args);
    const second = await handleRazorpayWebhook(args);
    const third = await handleRazorpayWebhook(args);
    expect(first.body).toBe("OK");
    expect(second.body).toBe("Duplicate event ignored");
    expect(third.body).toBe("Duplicate event ignored");
    expect(await db.webhookEvent.count()).toBe(1);
    expect(await db.payment.count({ where: { status: "CAPTURED" } })).toBe(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: f.fudgy.id } })).soldCount).toBe(1);
    expect((await reload(placed.id)).history.filter((h) => h.toStatus === "PAID")).toHaveLength(1);
  });

  it("ignores a captured event with the wrong amount", async () => {
    const placed = await pendingRazorpayOrder();
    const body = capturedBody("order_RZP1", 5_000);
    await handleRazorpayWebhook({ rawBody: body, signature: sign(body), eventId: "evt_bad", secret });
    expect((await reload(placed.id)).paymentStatus).toBe("PENDING");
  });

  it("records a failed payment event", async () => {
    const placed = await pendingRazorpayOrder();
    const body = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { id: "pay_f", order_id: "order_RZP1", error_code: "BAD_REQUEST_ERROR", error_description: "Card declined" } } } });
    await handleRazorpayWebhook({ rawBody: body, signature: sign(body), eventId: "evt_fail", secret });
    expect(await reload(placed.id)).toMatchObject({ paymentStatus: "FAILED", fulfillmentStatus: "PENDING_PAYMENT" });
  });

  it("acknowledges unknown events and unknown orders without error", async () => {
    const unknown = JSON.stringify({ event: "subscription.charged", payload: {} });
    expect((await handleRazorpayWebhook({ rawBody: unknown, signature: sign(unknown), eventId: "e_u", secret })).status).toBe(200);
    const body = capturedBody("order_DOES_NOT_EXIST", 100);
    expect((await handleRazorpayWebhook({ rawBody: body, signature: sign(body), eventId: "e_n", secret })).status).toBe(200);
  });

  it("applyPaymentFailed never overrides a paid order", async () => {
    const placed = await pendingRazorpayOrder();
    await applyPaymentCaptured({ providerOrderId: "order_RZP1", providerPaymentId: "pay_ok", amountPaise: 105_000, currency: "INR", actorLabel: "t" });
    await applyPaymentFailed({ providerOrderId: "order_RZP1", reason: "late failure" });
    expect((await reload(placed.id)).paymentStatus).toBe("PAID");
  });
});
