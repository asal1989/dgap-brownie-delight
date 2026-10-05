import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyRazorpaySignature } from "@/lib/payments/providers";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  publicId: z.string().min(1).max(60),
  razorpay_order_id: z.string().min(1).max(80),
  razorpay_payment_id: z.string().min(1).max(80),
  razorpay_signature: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const rl = rateLimit(`rzp-verify:${await clientIp()}`, 20, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  const b = parsed.data;

  const order = await prisma.order.findUnique({ where: { publicId: b.publicId }, include: { payment: true } });
  if (!order?.payment || order.payment.providerOrderId !== b.razorpay_order_id) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }
  if (!verifyRazorpaySignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
    return NextResponse.json({ ok: false, error: "Payment could not be verified" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { orderId: order.id },
      data: { status: "PAID", providerPaymentId: b.razorpay_payment_id },
    }),
    prisma.order.update({ where: { id: order.id }, data: { status: "CONFIRMED" } }),
  ]);
  return NextResponse.json({ ok: true });
}
