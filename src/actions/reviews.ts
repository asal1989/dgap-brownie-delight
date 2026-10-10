"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, clientIp } from "@/lib/auth/session";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import type { FormState } from "./newsletter";

const schema = z.object({
  orderNumber: z.string().min(1).max(40),
  productId: z.string().min(1).max(40),
  rating: z.coerce.number().int().min(1, "Please choose a rating").max(5),
  title: z.string().trim().max(80).optional().default(""),
  body: z.string().trim().min(10, "Please write at least a sentence").max(1000),
});

/**
 * Reviews are only accepted from the signed-in customer who received the product (a delivered order),
 * are marked as verified purchases, and appear publicly only after a moderator approves them.
 */
export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to leave a review." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your review." };

  const limit = await rateLimit(`review:${user.id}:${await clientIp()}`, LIMITS.review);
  if (!limit.ok) return { ok: false, message: "You are submitting reviews too quickly. Please try again later." };

  const order = await db.order.findFirst({
    where: { orderNumber: parsed.data.orderNumber, userId: user.id, fulfillmentStatus: "DELIVERED", items: { some: { productId: parsed.data.productId } } },
    select: { id: true },
  });
  if (!order) return { ok: false, message: "You can review a product after your order has been delivered." };

  const existing = await db.review.findFirst({ where: { productId: parsed.data.productId, orderId: order.id, userId: user.id } });
  if (existing) return { ok: false, message: "You have already reviewed this product for this order." };

  await db.review.create({
    data: {
      productId: parsed.data.productId,
      orderId: order.id,
      userId: user.id,
      authorName: user.name.split(" ")[0] || "Customer",
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body,
      verifiedPurchase: true,
      status: "PENDING",
    },
  });
  return { ok: true, message: "Thank you. Your review will appear once it has been approved." };
}
