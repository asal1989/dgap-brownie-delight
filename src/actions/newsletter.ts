"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth/session";

export type FormState = { ok: boolean; message: string } | null;

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address").max(120),
  consent: z.literal("on", { message: "Please tick the box to give your consent" }),
  /** Honeypot: real visitors leave this empty. */
  website: z.string().max(0).optional(),
});

const CONSENT_TEXT = "I agree to receive occasional emails from DGAP Brownie Delight and understand I can unsubscribe at any time.";

export async function subscribeNewsletter(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse({ email: formData.get("email"), consent: formData.get("consent") ?? undefined, website: formData.get("website") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your details" };

  const limit = await rateLimit(`newsletter:${await clientIp()}`, LIMITS.newsletter);
  if (!limit.ok) return { ok: false, message: "Too many attempts. Please try again later." };

  await db.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    create: { email: parsed.data.email, consentText: CONSENT_TEXT, source: "homepage" },
    update: { unsubscribedAt: null, consentText: CONSENT_TEXT, consentAt: new Date() },
  });
  return { ok: true, message: "Thank you. You are on the list." };
}
