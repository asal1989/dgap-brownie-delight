"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/utils";
import type { ActionResult } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().max(120).refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email"),
  phone: z.string().trim().max(20).refine((v) => v === "" || /^[+\d][\d\s-]{6,18}$/.test(v), "Enter a valid phone number"),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000),
  website: z.string().max(0).optional(), // honeypot: real users leave this empty
});

export async function sendContactMessage(formData: FormData): Promise<ActionResult> {
  const rl = rateLimit(`contact:${await clientIp()}`, 4, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "Too many messages. Please try again later." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  const d = parsed.data;
  if (!d.email && !d.phone) return { ok: false, error: "Please share an email or phone number so we can reply." };

  await prisma.contactMessage.create({
    data: { name: sanitizeText(d.name), email: d.email || null, phone: d.phone || null, message: sanitizeText(d.message) },
  });
  return { ok: true, message: "Thank you! We've received your message and will get back to you soon." };
}
