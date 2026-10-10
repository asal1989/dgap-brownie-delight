import { z } from "zod";

/** Normalise an Indian mobile number to "91XXXXXXXXXX". Returns null when invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const m = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return m ? `91${m[1]}` : null;
}

const phone = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine((v) => normalizePhone(v) !== null, "Enter a valid 10-digit Indian mobile number")
  .transform((v) => normalizePhone(v)!);

const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const checkoutSchema = z.object({
  customerName: text("Name", 80),
  customerEmail: z.string().trim().email("Enter a valid email").max(120).or(z.literal("")).default(""),
  customerPhone: phone,
  /** Recipient (may differ for gifts). Defaults to the customer on the server. */
  recipientName: z.string().trim().max(80).default(""),
  recipientPhone: z
    .string()
    .trim()
    .refine((v) => v === "" || normalizePhone(v) !== null, "Enter a valid 10-digit Indian mobile number")
    .default(""),
  line1: text("Address", 160),
  line2: z.string().trim().max(160).default(""),
  city: text("City", 60),
  state: z.string().trim().max(60).default(""),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit postal code"),
  deliveryNote: z.string().trim().max(300).default(""),
  giftMessage: z.string().trim().max(300).default(""),
  deliveryOptionId: z.string().trim().min(1, "Choose a delivery option").max(40),
  paymentMethod: z.enum(["ONLINE", "COD"]),
  /** Client-generated; makes a double-submit return the same order instead of creating two. */
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
/** What the browser form holds before transformation. */
export type CheckoutFormValues = z.input<typeof checkoutSchema>;
