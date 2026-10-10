import bcrypt from "bcryptjs";
import { z } from "zod";

const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Compare against a dummy hash so unknown-email logins take the same time as wrong-password ones. */
const DUMMY_HASH = bcrypt.hashSync("dgap-timing-equaliser", COST);
export const burnPasswordCheck = (plain: string) => bcrypt.compare(plain, DUMMY_HASH);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters")
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Include both letters and numbers");

export const adminPasswordSchema = z
  .string()
  .min(12, "Admin passwords need at least 12 characters")
  .max(128)
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), "Include upper-case, lower-case and a number");
