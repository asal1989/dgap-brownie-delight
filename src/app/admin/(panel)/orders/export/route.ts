import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, audit } from "@/lib/audit";
import { authorize } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildOrderOrderBy, buildOrderWhere, csvRow, parseOrderFilters } from "@/lib/order-list";

export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

/** CSV export of the filtered order list. Requires the `orders:export` permission, checked on the server. */
export async function GET(req: NextRequest) {
  const auth = await authorize("orders:export");
  if (!auth.ok) return new NextResponse(auth.error, { status: auth.status });

  const f = parseOrderFilters(Object.fromEntries(req.nextUrl.searchParams));
  const orders = await db.order.findMany({
    where: buildOrderWhere(f),
    orderBy: buildOrderOrderBy(f.sort),
    take: MAX_ROWS,
    include: { items: { select: { productName: true, variantLabel: true, quantity: true } } },
  });
  const header = ["Order number", "Placed at (IST)", "Customer", "Phone", "Email", "Items", "Subtotal (INR)", "Discount (INR)", "Shipping (INR)", "Tax (INR)", "Total (INR)", "Coupon", "Payment method", "Payment status", "Fulfilment status", "Delivery", "City", "Postal code", "Test order"];
  const inr = (p: number) => (p / 100).toFixed(2);
  const rows = orders.map((o) => csvRow([
    o.orderNumber,
    new Intl.DateTimeFormat("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(o.placedAt),
    o.customerName, o.customerPhone, o.customerEmail ?? "",
    o.items.map((i) => `${i.quantity} x ${i.productName} (${i.variantLabel})`).join("; "),
    inr(o.subtotalPaise), inr(o.discountPaise), inr(o.shippingPaise), inr(o.taxPaise), inr(o.totalPaise),
    o.couponCode ?? "", o.paymentMethod, o.paymentStatus, o.fulfillmentStatus, o.deliveryLabel, o.shipCity, o.shipPostalCode, o.isTest ? "yes" : "no",
  ]));
  await audit(actorFromUser(auth.user), "orders.export", "Order", null, { rows: orders.length, filters: f }, db);

  return new NextResponse(`﻿${[csvRow(header), ...rows].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
