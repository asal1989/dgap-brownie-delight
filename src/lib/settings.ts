import { cache } from "react";
import { z } from "zod";
import { db } from "./db";
import { env } from "./env";

const digits = z.string().trim().regex(/^(\d{8,15})?$/, "Digits only, with country code (e.g. 919876543210)");
const optionalUrl = z.string().trim().url("Enter a full URL starting with https://").or(z.literal(""));

export const deliveryOptionSchema = z.object({
  id: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).default(""),
  feePaise: z.number().int().min(0).max(10_000_000),
  enabled: z.boolean().default(true),
});

export const deliveryZoneSchema = z.object({
  id: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(80),
  /** Postal-code prefixes this zone covers, e.g. "5600". */
  postalPrefixes: z.array(z.string().trim().regex(/^\d{2,6}$/)).default([]),
  feePaise: z.number().int().min(0).max(10_000_000),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(80).default("DGAP Brownie Delight"),
  tagline: z.string().trim().max(120).default("Where Every Bite Feels Homemade."),
  logoUrl: z.string().trim().max(500).default("/images/logo-192.png"),
  whatsappNumber: digits.default(""),
  contactEmail: z.string().trim().email().or(z.literal("")).default(""),
  contactPhone: z.string().trim().max(30).default(""),
  address: z.string().trim().max(300).default(""),
  instagramUrl: optionalUrl.default(""),
  facebookUrl: optionalUrl.default(""),
  announcement: z
    .object({ enabled: z.boolean().default(true), message: z.string().trim().max(160).default("Handcrafted brownies, baked in Bangalore") })
    .default({ enabled: true, message: "Handcrafted brownies, baked in Bangalore" }),

  /** Safe by default: the shop stays closed until an admin has set prices and delivery rules. */
  orderingEnabled: z.boolean().default(false),
  orderingClosedMessage: z.string().trim().max(240).default("Online ordering opens soon. Message us on WhatsApp to enquire."),
  codEnabled: z.boolean().default(false),
  onlinePaymentEnabled: z.boolean().default(true),
  currency: z.literal("INR").default("INR"),
  orderPrefix: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/, "Capital letters and numbers only").default("DGAP"),

  deliveryOptions: z.array(deliveryOptionSchema).min(1).default([
    { id: "standard", label: "Standard delivery", description: "", feePaise: 0, enabled: true },
  ]),
  deliveryZones: z.array(deliveryZoneSchema).default([]),
  /** When true, only postal codes inside a delivery zone can check out. */
  restrictToZones: z.boolean().default(false),
  freeDeliveryThresholdPaise: z.number().int().min(0).nullable().default(null),

  tax: z
    .object({
      enabled: z.boolean().default(false),
      /** Basis points: 500 = 5%. */
      rateBp: z.number().int().min(0).max(10000).default(0),
      inclusive: z.boolean().default(true),
      label: z.string().trim().max(20).default("GST"),
      gstin: z.string().trim().max(20).default(""),
    })
    .default({ enabled: false, rateBp: 0, inclusive: true, label: "GST", gstin: "" }),

  policies: z
    .object({
      shipping: z.string().max(8000).default(""),
      refunds: z.string().max(8000).default(""),
      privacy: z.string().max(8000).default(""),
      terms: z.string().max(8000).default(""),
    })
    .default({ shipping: "", refunds: "", privacy: "", terms: "" }),
});

export type Settings = z.infer<typeof settingsSchema>;
export const SETTINGS_KEY = "site";

export const defaultSettings = (): Settings => settingsSchema.parse({});

/** Current business settings (defaults merged with whatever the admin saved). Cached per request. */
export const getSettings = cache(async (): Promise<Settings> => {
  const row = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
  const parsed = settingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : defaultSettings();
});

export async function saveSettings(patch: Partial<Settings>, actorId: string | null): Promise<Settings> {
  const current = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
  const merged = settingsSchema.parse({ ...((current?.value as object | null) ?? {}), ...patch });
  await db.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: merged, updatedById: actorId },
    update: { value: merged, updatedById: actorId },
  });
  return merged;
}

/** WhatsApp number from admin settings, falling back to the server environment. Never hardcoded. */
export function resolveWhatsAppNumber(settings: Pick<Settings, "whatsappNumber">): string | null {
  const n = settings.whatsappNumber || env().WHATSAPP_NUMBER || "";
  return /^\d{8,15}$/.test(n) ? n : null;
}

/** Delivery fee for an option, honouring a matching postal-code zone override. */
export function deliveryFor(
  settings: Pick<Settings, "deliveryOptions" | "deliveryZones" | "restrictToZones">,
  optionId: string,
  postalCode: string,
): { ok: true; label: string; feePaise: number } | { ok: false; reason: string } {
  const option = settings.deliveryOptions.find((o) => o.id === optionId && o.enabled);
  if (!option) return { ok: false, reason: "Please choose an available delivery option." };
  const postal = postalCode.replace(/\s/g, "");
  const zone = settings.deliveryZones.find((z) => z.postalPrefixes.some((p) => postal.startsWith(p)));
  if (settings.restrictToZones && !zone) {
    return { ok: false, reason: "Sorry, we do not deliver to this postal code yet." };
  }
  return { ok: true, label: option.label, feePaise: zone ? zone.feePaise : option.feePaise };
}
