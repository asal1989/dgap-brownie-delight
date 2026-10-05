import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

export const checkoutSchema = z.object({
  fullName: text(80).min(2, "Please enter your full name"),
  mobile: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address"),
  address: text(200).min(5, "Please enter your street address"),
  area: text(80).min(2, "Please enter your area / locality"),
  city: text(60).min(2, "Please enter your city"),
  state: text(60).min(2, "Please enter your state"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  deliveryInstructions: text(300),
  notes: text(500),
  paymentMethod: z.enum(["COD", "RAZORPAY", "UPI"]),
  couponCode: text(40),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

export const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(40),
      quantity: z.number().int().min(1).max(50),
    }),
  )
  .min(1, "Your cart is empty")
  .max(40);

export type CartItemsInput = z.infer<typeof cartItemsSchema>;
