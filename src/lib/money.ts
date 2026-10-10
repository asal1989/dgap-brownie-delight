/** Money is always an integer number of paise. Never use floating point for amounts. */

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Parse a rupee amount typed by an admin ("1000", "1,000", "249.50") into paise.
 * Returns null for anything that is not a plain non-negative amount with at most two decimals.
 */
export function rupeesToPaise(input: string): number | null {
  const cleaned = input.trim().replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** Paise to an editable rupee string ("1000" or "249.50"). */
export function paiseToRupeesInput(paise: number | null | undefined): string {
  if (paise == null) return "";
  const whole = Math.floor(paise / 100);
  const frac = paise % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}

export const isPaise = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
