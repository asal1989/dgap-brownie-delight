"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useSiteConfig } from "@/components/providers";
import { buildEnquiryMessage, whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/** Floating WhatsApp shortcut. Hidden when no number is configured, and on pages with their own sticky bar. */
export function WhatsAppFloat() {
  const { whatsappDigits, brandName } = useSiteConfig();
  const pathname = usePathname();
  if (!whatsappDigits) return null;
  const hasStickyBar = /^\/shop\/[^/]+$/.test(pathname) || /^\/(checkout|cart)/.test(pathname);
  return (
    <a
      href={whatsappLink(whatsappDigits, buildEnquiryMessage(brandName, "I need help choosing brownies."))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "no-print group fixed right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#1f8f4e] px-4 text-white shadow-lift transition hover:bg-[#187a42]",
        hasStickyBar ? "bottom-24 lg:bottom-6" : "bottom-20 lg:bottom-6",
      )}
    >
      <MessageCircle className="size-6" aria-hidden />
      <span className="hidden text-sm font-semibold sm:inline">Need help choosing?</span>
    </a>
  );
}
