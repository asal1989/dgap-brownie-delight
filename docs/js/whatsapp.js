import { CONTACT, SITE, ORDER_NOTE } from "./config.js";
import { formatPrice, hasPrice } from "./utils.js";

export const whatsappReady = () => /^\d{8,15}$/.test(CONTACT.whatsappNumber || "");

export function whatsappUrl(message) {
  const text = encodeURIComponent(message);
  return whatsappReady() ? `https://wa.me/${CONTACT.whatsappNumber}?text=${text}` : null;
}

/**
 * Cart/order lines → { subtotal | null, allPriced }.
 * A line is { name, size, qty, unit (number|null), extras?: string[] }.
 * The subtotal is only reported when EVERY line has a price.
 */
export function orderTotals(lines) {
  const allPriced = lines.length > 0 && lines.every((l) => hasPrice(l.unit));
  const subtotal = allPriced ? lines.reduce((s, l) => s + l.unit * l.qty, 0) : null;
  return { subtotal, allPriced };
}

/** Build the plain-text WhatsApp message for any set of lines. */
export function buildOrderMessage(lines) {
  const { subtotal } = orderTotals(lines);
  const out = [`Hi ${SITE.brand}! I'd like to request this order:`, ""];
  lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name}`);
    if (l.size) out.push(`   Size: ${l.size}`);
    out.push(`   Quantity: ${l.qty}`);
    if (l.extras?.length) l.extras.forEach((e) => out.push(`   - ${e}`));
    if (hasPrice(l.unit)) out.push(`   Price: ${formatPrice(l.unit)} each = ${formatPrice(l.unit * l.qty)}`);
    else out.push("   Price: to be confirmed");
  });
  out.push("");
  out.push(subtotal != null ? `Subtotal: ${formatPrice(subtotal)}` : "Subtotal: to be confirmed (some prices not set yet)");
  out.push("");
  out.push(ORDER_NOTE);
  return out.join("\n");
}

export function buildEnquiryMessage(topic) {
  return `Hi ${SITE.brand}! ${topic}`;
}
