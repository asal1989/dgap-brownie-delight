export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatusValue, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const STATUS_TONE: Record<OrderStatusValue, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-sky-100 text-sky-900",
  PROCESSING: "bg-indigo-100 text-indigo-900",
  OUT_FOR_DELIVERY: "bg-violet-100 text-violet-900",
  DELIVERED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-red-100 text-red-900",
};
