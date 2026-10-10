import { db } from "./db";

/** Business timezone: all "today / this month" boundaries are calculated in IST (UTC+05:30). */
const IST_OFFSET_MS = 5.5 * 3600_000;

export const PERIODS = ["today", "7d", "30d", "month", "all"] as const;
export type PeriodKey = (typeof PERIODS)[number];

export type Period = { key: PeriodKey; label: string; from: Date | null; to: Date };

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  all: "All time",
};

export function startOfDayIST(now: Date): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS);
}

export function resolvePeriod(key: string | undefined, now = new Date()): Period {
  const k = (PERIODS as readonly string[]).includes(key ?? "") ? (key as PeriodKey) : "30d";
  const today = startOfDayIST(now);
  let from: Date | null;
  switch (k) {
    case "today": from = today; break;
    case "7d": from = new Date(today.getTime() - 6 * 86_400_000); break;
    case "30d": from = new Date(today.getTime() - 29 * 86_400_000); break;
    case "month": {
      const ist = new Date(now.getTime() + IST_OFFSET_MS);
      from = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - IST_OFFSET_MS);
      break;
    }
    default: from = null;
  }
  return { key: k, label: PERIOD_LABEL[k], from, to: now };
}

export const describePeriod = (p: Period) =>
  p.from
    ? `${p.label}: ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(p.from)} to ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(p.to)} (IST)`
    : "All time";

/** Orders where money was actually collected (a paid order, including ones later refunded). */
const COLLECTED = ["PAID", "PARTIALLY_REFUNDED", "REFUND_PENDING", "REFUNDED"] as const;

export type DashboardStats = Awaited<ReturnType<typeof dashboardStats>>;

/**
 * Every figure is computed from stored orders/payments/refunds:
 *  - Gross sales  = sum of the totals of orders paid within the period (by payment date)
 *  - Discounts    = coupon discounts on those same orders (already deducted from gross)
 *  - Refunds      = refunds processed within the period
 *  - Net sales    = gross sales - refunds
 *  - Average order value = gross sales / number of paid orders
 * Test orders (development payment mode) are excluded unless `includeTest` is set.
 */
export async function dashboardStats(period: Period, includeTest: boolean) {
  const testFilter = includeTest ? {} : { isTest: false };
  const placed = period.from ? { placedAt: { gte: period.from, lte: period.to } } : {};
  const paidWindow = period.from ? { paidAt: { gte: period.from, lte: period.to } } : {};
  const today = startOfDayIST(new Date());

  const [
    totalOrders, ordersToday, openByStatus, delivered, cancelled, collected, refunds, topProducts, lowStock, recent,
  ] = await Promise.all([
    db.order.count({ where: { ...testFilter, ...placed } }),
    db.order.count({ where: { ...testFilter, placedAt: { gte: today } } }),
    db.order.groupBy({ by: ["fulfillmentStatus"], where: { ...testFilter, fulfillmentStatus: { in: ["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY"] } }, _count: true }),
    db.order.count({ where: { ...testFilter, ...placed, fulfillmentStatus: "DELIVERED" } }),
    db.order.count({ where: { ...testFilter, ...placed, fulfillmentStatus: "CANCELLED" } }),
    db.order.aggregate({ where: { ...testFilter, ...paidWindow, paymentStatus: { in: [...COLLECTED] } }, _sum: { totalPaise: true, discountPaise: true }, _count: true }),
    db.refund.aggregate({
      where: { status: "PROCESSED", ...(period.from ? { processedAt: { gte: period.from, lte: period.to } } : {}), ...(includeTest ? {} : { order: { isTest: false } }) },
      _sum: { amountPaise: true },
    }),
    db.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { order: { ...testFilter, ...paidWindow, paymentStatus: { in: [...COLLECTED] } } },
      _sum: { quantity: true, lineTotalPaise: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    db.productVariant.findMany({
      where: { archivedAt: null, trackInventory: true, product: { status: "ACTIVE" } },
      include: { product: { select: { name: true } } },
      orderBy: { stockQuantity: "asc" },
      take: 200,
    }),
    db.order.findMany({ where: testFilter, orderBy: { placedAt: "desc" }, take: 8, select: { id: true, orderNumber: true, customerName: true, totalPaise: true, fulfillmentStatus: true, paymentStatus: true, placedAt: true } }),
  ]);

  const open = Object.fromEntries(openByStatus.map((r) => [r.fulfillmentStatus, r._count])) as Record<string, number>;
  const gross = collected._sum.totalPaise ?? 0;
  const refunded = refunds._sum.amountPaise ?? 0;
  const paidOrders = collected._count;

  return {
    period,
    totalOrders,
    ordersToday,
    pending: open.PENDING_PAYMENT ?? 0,
    confirmed: open.CONFIRMED ?? 0,
    preparing: open.PREPARING ?? 0,
    readyForDispatch: open.READY_FOR_DISPATCH ?? 0,
    outForDelivery: open.OUT_FOR_DELIVERY ?? 0,
    completed: delivered,
    cancelled,
    paidOrders,
    grossSalesPaise: gross,
    discountsPaise: collected._sum.discountPaise ?? 0,
    refundsPaise: refunded,
    netSalesPaise: gross - refunded,
    averageOrderValuePaise: paidOrders > 0 ? Math.round(gross / paidOrders) : 0,
    bestsellers: topProducts.map((t) => ({ productId: t.productId, name: t.productName, units: t._sum.quantity ?? 0, revenuePaise: t._sum.lineTotalPaise ?? 0 })),
    lowStock: lowStock
      .filter((v) => v.stockQuantity <= v.lowStockThreshold)
      .map((v) => ({ id: v.id, product: v.product.name, label: v.label, sku: v.sku, stock: v.stockQuantity, threshold: v.lowStockThreshold })),
    recent,
  };
}

/** Day-by-day sales for the analytics page (IST days, paid orders only). */
export async function salesByDay(period: Period, includeTest: boolean) {
  const from = period.from ?? new Date(Date.now() - 89 * 86_400_000);
  const rows = await db.$queryRaw<{ day: string; orders: number; gross: number }[]>`
    SELECT to_char(("paidAt" AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::int AS orders,
           COALESCE(SUM("totalPaise"), 0)::bigint AS gross
    FROM "Order"
    WHERE "paidAt" >= ${from} AND "paidAt" <= ${period.to}
      AND "paymentStatus" IN ('PAID','PARTIALLY_REFUNDED','REFUND_PENDING','REFUNDED')
      AND (${includeTest}::boolean OR "isTest" = false)
    GROUP BY 1 ORDER BY 1`;
  return rows.map((r) => ({ day: r.day, orders: Number(r.orders), grossPaise: Number(r.gross) }));
}
