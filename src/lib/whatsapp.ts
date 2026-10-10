import { formatINR } from "./money";

export type WhatsAppLine = {
  name: string;
  variantLabel: string;
  quantity: number;
  unitPricePaise: number;
  /** Custom-box contents, e.g. "2 x Classic Fudgy Brownie". */
  extras?: string[];
};

export type WhatsAppMessageInput = {
  businessName: string;
  lines: WhatsAppLine[];
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  couponCode?: string | null;
  deliveryLabel?: string | null;
  deliveryArea?: string | null;
  customerName?: string | null;
  /** Present only once a real order exists. */
  orderNumber?: string | null;
  note?: string | null;
};

/**
 * Plain-text WhatsApp message. Without an order number it is explicitly an ENQUIRY, never a
 * confirmed or paid order. With one, it references the stored order.
 */
export function buildWhatsAppMessage(input: WhatsAppMessageInput): string {
  const out: string[] = [];
  if (input.orderNumber) {
    out.push(`Hello ${input.businessName}!`, `I have a question about my order ${input.orderNumber}.`);
  } else {
    out.push(
      `Hello ${input.businessName}!`,
      "This is an enquiry, not a confirmed order. I would like to order:",
    );
  }
  out.push("");
  input.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name} (${l.variantLabel})`);
    out.push(`   Quantity: ${l.quantity}`);
    out.push(`   Price: ${formatINR(l.unitPricePaise)} each = ${formatINR(l.unitPricePaise * l.quantity)}`);
    l.extras?.forEach((e) => out.push(`   - ${e}`));
  });
  out.push("");
  out.push(`Items total: ${formatINR(input.subtotalPaise)}`);
  if (input.discountPaise > 0) {
    out.push(`Discount${input.couponCode ? ` (${input.couponCode})` : ""}: -${formatINR(input.discountPaise)}`);
  } else if (input.couponCode) {
    out.push(`Coupon: ${input.couponCode}`);
  }
  if (input.deliveryLabel) {
    out.push(`Delivery: ${input.deliveryLabel}${input.shippingPaise > 0 ? ` (${formatINR(input.shippingPaise)})` : ""}`);
  }
  out.push(`Total: ${formatINR(input.totalPaise)}`);
  if (input.deliveryArea) out.push(`Delivery area: ${input.deliveryArea}`);
  if (input.customerName) out.push(`Name: ${input.customerName}`);
  if (input.note) out.push(`Note: ${input.note}`);
  if (!input.orderNumber) {
    out.push("", "Please confirm availability, delivery and payment details.");
  }
  return out.join("\n");
}

export function whatsAppUrl(number: string | null, message: string): string | null {
  if (!number || !/^\d{8,15}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
