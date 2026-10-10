import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { processNotifications } from "@/lib/notify";
import { expireUnpaidOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

function authorised(req: NextRequest): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Scheduled housekeeping: expire unpaid orders, deliver queued emails, clear expired sessions. */
export async function GET(req: NextRequest) {
  if (!authorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  const [expired, notifications] = await Promise.all([expireUnpaidOrders(60), processNotifications(50)]);
  const sessions = await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return NextResponse.json({ expiredOrders: expired, notifications, sessionsRemoved: sessions.count });
}
