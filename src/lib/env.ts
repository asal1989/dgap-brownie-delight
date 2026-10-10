import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SITE_URL: optionalString,
  PAYMENT_MODE: z
    .enum(["razorpay", "dev", "off"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_WEBHOOK_SECRET: optionalString,
  WHATSAPP_NUMBER: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  NOTIFICATIONS_DEV_LOG: optionalString,
  BLOB_READ_WRITE_TOKEN: optionalString,
  CRON_SECRET: optionalString,
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

/** Validated server environment. Parsed lazily so `next build` does not need runtime secrets. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export type PaymentMode = "razorpay" | "dev" | "off";

type ModeInput = Pick<Env, "NODE_ENV" | "PAYMENT_MODE" | "RAZORPAY_KEY_ID" | "RAZORPAY_KEY_SECRET">;

/**
 * How online payments work in this deployment.
 *  - razorpay: Razorpay keys are configured.
 *  - dev: simulated payments. NEVER allowed in production; always flagged as test data.
 *  - off: online payment is unavailable (COD / WhatsApp only).
 */
export function paymentMode(e: ModeInput = env()): PaymentMode {
  const hasKeys = Boolean(e.RAZORPAY_KEY_ID && e.RAZORPAY_KEY_SECRET);
  const production = e.NODE_ENV === "production";
  let mode: PaymentMode = e.PAYMENT_MODE ?? (hasKeys ? "razorpay" : production ? "off" : "dev");
  if (mode === "razorpay" && !hasKeys) mode = "off";
  if (mode === "dev" && production) mode = "off";
  return mode;
}

export const isProduction = () => env().NODE_ENV === "production";

export function siteUrl(): string {
  return (env().SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
