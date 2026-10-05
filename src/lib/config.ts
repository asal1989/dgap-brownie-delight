import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

/** Every business-specific value lives here and is editable from /admin/settings. Nothing is invented. */
export const SETTING_DEFAULTS = {
  brandName: "DGAP Brownie Delight",
  tagline: "Premium handcrafted brownies and dessert boxes",
  logo: "",
  heroImage: "",
  signatureImage: "",
  signatureProductSlug: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  businessHours: "",
  instagram: "",
  facebook: "",
  fssai: "",
  currency: "INR",
  deliveryFee: "0",
  freeDeliveryThreshold: "0",
  minimumOrder: "0",
  sameDayDelivery: "false",
  deliveryAreas: "",
  expectedDelivery: "",
  aboutStory: "",
  mapEmbedUrl: "",
  policyPrivacy: "",
  policyTerms: "",
  policyShipping: "",
  policyRefund: "",
  codEnabled: "true",
  seoTitle: "DGAP Brownie Delight | Premium Handcrafted Brownies",
  seoDescription:
    "Rich, fudgy brownies baked fresh in small batches. Order premium brownies and gift boxes online from DGAP Brownie Delight.",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type RawSettings = Record<SettingKey, string>;

export interface SiteSettings extends RawSettings {
  deliveryFeeNum: number;
  freeDeliveryThresholdNum: number;
  minimumOrderNum: number;
  sameDayDeliveryBool: boolean;
  codEnabledBool: boolean;
  whatsappDigits: string;
}

const toInt = (v: string): number => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await prisma.setting.findMany();
  const merged: RawSettings = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    if (row.key in SETTING_DEFAULTS) merged[row.key as SettingKey] = row.value;
  }
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || merged.whatsapp || "").replace(/\D/g, "");
  return {
    ...merged,
    deliveryFeeNum: toInt(merged.deliveryFee),
    freeDeliveryThresholdNum: toInt(merged.freeDeliveryThreshold),
    minimumOrderNum: toInt(merged.minimumOrder),
    sameDayDeliveryBool: merged.sameDayDelivery === "true",
    codEnabledBool: merged.codEnabled !== "false",
    whatsappDigits: whatsapp,
  };
});

/** Fields safe to hand to client components. */
export interface PublicConfig {
  brandName: string;
  whatsappDigits: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minimumOrder: number;
}

export function toPublicConfig(s: SiteSettings): PublicConfig {
  return {
    brandName: s.brandName,
    whatsappDigits: s.whatsappDigits,
    deliveryFee: s.deliveryFeeNum,
    freeDeliveryThreshold: s.freeDeliveryThresholdNum,
    minimumOrder: s.minimumOrderNum,
  };
}
