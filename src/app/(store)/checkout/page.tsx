import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return <CheckoutForm user={user ? { name: user.name, email: user.email, phone: user.phone } : null} />;
}
