"use client";

import { MessageCircle } from "lucide-react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { useSiteConfig } from "@/components/providers";
import { useCart } from "@/hooks/use-cart";
import { buildOrderMessage, whatsappLink } from "@/lib/whatsapp";

/** Builds the WhatsApp message from the live cart. Renders nothing if no number is configured. */
export function WhatsAppCartButton({
  variant = "outline",
  size = "md",
  className,
  label = "Order on WhatsApp",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  label?: string;
}) {
  const { whatsappDigits, brandName } = useSiteConfig();
  const { lines, subtotal } = useCart();
  if (!whatsappDigits) return null;
  const href = whatsappLink(
    whatsappDigits,
    lines.length
      ? buildOrderMessage(brandName, lines.map((l) => ({ name: l.name, quantity: l.quantity })), subtotal)
      : `Hi ${brandName}! I'd like to place an order.`,
  );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClasses(variant, size, className)}>
      <MessageCircle className="size-4" aria-hidden /> {label}
    </a>
  );
}
