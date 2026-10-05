"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/utils";
import type { ActionResult } from "@/types";

const schema = z.object({
  productId: z.string().min(1).max(40),
  customerName: z.string().trim().min(2, "Enter your name").max(60),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  review: z.string().trim().min(10, "Please write at least 10 characters").max(1000),
});

/** Reviews are stored unapproved; an admin must approve them before they appear on the site. */
export async function submitReview(formData: FormData): Promise<ActionResult> {
  const rl = rateLimit(`review:${await clientIp()}`, 3, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "Too many reviews submitted. Please try again later." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review" };

  const exists = await prisma.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } });
  if (!exists) return { ok: false, error: "Product not found" };
  await prisma.review.create({
    data: {
      productId: parsed.data.productId,
      customerName: sanitizeText(parsed.data.customerName),
      rating: parsed.data.rating,
      review: sanitizeText(parsed.data.review),
      isApproved: false,
    },
  });
  return { ok: true, message: "Thank you! Your review will appear once it has been approved." };
}
