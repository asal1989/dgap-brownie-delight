import type { FulfillmentStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";

/** Allowed fulfilment moves. DELIVERED and CANCELLED are terminal. */
export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_DISPATCH", "CANCELLED"],
  READY_FOR_DISPATCH: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Allowed payment-status moves. */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  FAILED: ["PENDING", "PAID"],
  PAID: ["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"],
  REFUND_PENDING: ["PARTIALLY_REFUNDED", "REFUNDED", "PAID"],
  PARTIALLY_REFUNDED: ["REFUND_PENDING", "REFUNDED"],
  REFUNDED: [],
};

export const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  PENDING_PAYMENT: "Pending payment",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY_FOR_DISPATCH: "Ready for dispatch",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Payment pending",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUND_PENDING: "Refund pending",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

/** The happy path shown on the customer's tracking timeline. */
export const FULFILLMENT_STEPS: FulfillmentStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_DISPATCH",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

type OrderLike = {
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
};

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

export function checkFulfillmentTransition(order: OrderLike, to: FulfillmentStatus): TransitionCheck {
  const from = order.fulfillmentStatus;
  if (!FULFILLMENT_TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      reason: `An order that is "${FULFILLMENT_LABEL[from]}" cannot move to "${FULFILLMENT_LABEL[to]}".`,
    };
  }
  // Nothing past "pending payment" is allowed without money (or an accepted cash-on-delivery order).
  if (to !== "CANCELLED") {
    const paid = order.paymentStatus === "PAID";
    const cod = order.paymentMethod === "COD";
    if (!paid && !cod) return { ok: false, reason: "The order has not been paid yet." };
  }
  return { ok: true };
}

export function checkPaymentTransition(from: PaymentStatus, to: PaymentStatus): TransitionCheck {
  if (!PAYMENT_TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `Payment cannot move from "${PAYMENT_LABEL[from]}" to "${PAYMENT_LABEL[to]}".` };
  }
  return { ok: true };
}

/** Next fulfilment steps an admin can offer for this order (cancellation is handled separately). */
export function nextFulfillmentSteps(order: OrderLike): FulfillmentStatus[] {
  return FULFILLMENT_TRANSITIONS[order.fulfillmentStatus].filter(
    (to) => to !== "CANCELLED" && checkFulfillmentTransition(order, to).ok,
  );
}

export const canCancel = (order: OrderLike) => FULFILLMENT_TRANSITIONS[order.fulfillmentStatus].includes("CANCELLED");

/** A cancelled order that was paid still needs an explicit, verified refund. It is never automatic. */
export const needsRefund = (order: OrderLike) => order.fulfillmentStatus === "CANCELLED" && order.paymentStatus === "PAID";
