import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

export const ORDER_PAGE_SIZE = 20;

export const orderListSchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional(),
  payment: z.enum(["PENDING", "PAID", "FAILED", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(["date-desc", "date-asc", "total-desc", "total-asc"]).default("date-desc"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  test: z.enum(["1"]).optional(),
});
export type OrderListFilters = z.infer<typeof orderListSchema>;

type Raw = Record<string, string | string[] | undefined>;

export function parseOrderFilters(raw: Raw): OrderListFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const parsed = orderListSchema.safeParse(Object.fromEntries(["q", "status", "payment", "from", "to", "sort", "page", "test"].map((k) => [k, first(raw[k])])));
  return parsed.success ? parsed.data : orderListSchema.parse({});
}

/** IST day boundaries for date filters ("2026-10-01" means that calendar day in India). */
const istStart = (d: string) => new Date(`${d}T00:00:00+05:30`);
const istEnd = (d: string) => new Date(new Date(`${d}T00:00:00+05:30`).getTime() + 86_400_000 - 1);

export function buildOrderWhere(f: OrderListFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (f.q) {
    where.OR = [
      { orderNumber: { contains: f.q, mode: "insensitive" } },
      { customerName: { contains: f.q, mode: "insensitive" } },
      { customerPhone: { contains: f.q.replace(/[\s+\-]/g, "") } },
      { customerEmail: { contains: f.q, mode: "insensitive" } },
    ];
  }
  if (f.status) where.fulfillmentStatus = f.status;
  if (f.payment) where.paymentStatus = f.payment;
  if (f.from || f.to) where.placedAt = { ...(f.from ? { gte: istStart(f.from) } : {}), ...(f.to ? { lte: istEnd(f.to) } : {}) };
  if (!f.test) where.isTest = false;
  return where;
}

export function buildOrderOrderBy(sort: OrderListFilters["sort"]): Prisma.OrderOrderByWithRelationInput[] {
  switch (sort) {
    case "date-asc": return [{ placedAt: "asc" }];
    case "total-desc": return [{ totalPaise: "desc" }, { placedAt: "desc" }];
    case "total-asc": return [{ totalPaise: "asc" }, { placedAt: "desc" }];
    default: return [{ placedAt: "desc" }];
  }
}

/** Neutralise spreadsheet formula injection ("=", "+", "-", "@", tab, CR at the start of a cell). */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");
