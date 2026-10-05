import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email").max(120),
  password: z.string().min(1, "Enter your password").max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.email("Enter a valid email").max(120),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
