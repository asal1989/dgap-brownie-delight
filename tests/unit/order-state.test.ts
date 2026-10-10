import { describe, expect, it } from "vitest";
import {
  canCancel,
  checkFulfillmentTransition,
  checkPaymentTransition,
  needsRefund,
  nextFulfillmentSteps,
} from "@/lib/order-state";
import type { FulfillmentStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";

const o = (
  fulfillmentStatus: FulfillmentStatus,
  paymentStatus: PaymentStatus = "PAID",
  paymentMethod: PaymentMethod = "RAZORPAY",
) => ({ fulfillmentStatus, paymentStatus, paymentMethod });

describe("fulfilment transitions", () => {
  it("allows the forward path for a paid order", () => {
    expect(checkFulfillmentTransition(o("CONFIRMED"), "PREPARING").ok).toBe(true);
    expect(checkFulfillmentTransition(o("PREPARING"), "READY_FOR_DISPATCH").ok).toBe(true);
    expect(checkFulfillmentTransition(o("READY_FOR_DISPATCH"), "OUT_FOR_DELIVERY").ok).toBe(true);
    expect(checkFulfillmentTransition(o("OUT_FOR_DELIVERY"), "DELIVERED").ok).toBe(true);
  });

  it("rejects skipping steps and moving backwards", () => {
    expect(checkFulfillmentTransition(o("CONFIRMED"), "DELIVERED").ok).toBe(false);
    expect(checkFulfillmentTransition(o("PREPARING"), "CONFIRMED").ok).toBe(false);
  });

  it("treats DELIVERED and CANCELLED as terminal", () => {
    for (const to of ["PREPARING", "CANCELLED", "CONFIRMED"] as const) {
      expect(checkFulfillmentTransition(o("DELIVERED"), to).ok).toBe(false);
    }
    expect(checkFulfillmentTransition(o("CANCELLED"), "CONFIRMED").ok).toBe(false);
  });

  it("will not progress an unpaid online order", () => {
    const r = checkFulfillmentTransition(o("PENDING_PAYMENT", "PENDING"), "CONFIRMED");
    expect(r.ok).toBe(false);
  });

  it("lets cash-on-delivery orders progress while payment is still pending", () => {
    expect(checkFulfillmentTransition(o("CONFIRMED", "PENDING", "COD"), "PREPARING").ok).toBe(true);
  });

  it("can always cancel an unpaid order", () => {
    expect(checkFulfillmentTransition(o("PENDING_PAYMENT", "PENDING"), "CANCELLED").ok).toBe(true);
  });

  it("offers only valid next steps and never cancel", () => {
    expect(nextFulfillmentSteps(o("PREPARING"))).toEqual(["READY_FOR_DISPATCH"]);
    expect(nextFulfillmentSteps(o("DELIVERED"))).toEqual([]);
    expect(nextFulfillmentSteps(o("PENDING_PAYMENT", "PENDING"))).toEqual([]);
  });

  it("canCancel is false once delivered or cancelled", () => {
    expect(canCancel(o("PREPARING"))).toBe(true);
    expect(canCancel(o("DELIVERED"))).toBe(false);
    expect(canCancel(o("CANCELLED"))).toBe(false);
  });

  it("flags a cancelled, paid order as needing an explicit refund", () => {
    expect(needsRefund(o("CANCELLED", "PAID"))).toBe(true);
    expect(needsRefund(o("CANCELLED", "PENDING"))).toBe(false);
    expect(needsRefund(o("CANCELLED", "REFUNDED"))).toBe(false);
  });
});

describe("payment transitions", () => {
  it("follows the refund lifecycle", () => {
    expect(checkPaymentTransition("PAID", "REFUND_PENDING").ok).toBe(true);
    expect(checkPaymentTransition("REFUND_PENDING", "PARTIALLY_REFUNDED").ok).toBe(true);
    expect(checkPaymentTransition("PARTIALLY_REFUNDED", "REFUNDED").ok).toBe(true);
  });
  it("rejects impossible moves", () => {
    expect(checkPaymentTransition("PENDING", "REFUNDED").ok).toBe(false);
    expect(checkPaymentTransition("REFUNDED", "PAID").ok).toBe(false);
  });
});
