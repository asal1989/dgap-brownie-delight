export interface WhatsAppLine {
  name: string;
  quantity: number;
}

export function whatsappLink(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildOrderMessage(brand: string, lines: WhatsAppLine[], total?: number): string {
  const rows = lines.map((l) => `${l.quantity} × ${l.name}`).join("\n");
  const totalLine = total != null ? `\nTotal: ₹${total.toLocaleString("en-IN")}` : "";
  return `Hi ${brand}! I would like to order:\n${rows}${totalLine}`;
}

export function buildEnquiryMessage(brand: string, context?: string): string {
  return context ? `Hi ${brand}! ${context}` : `Hi ${brand}! I have a question about your brownies.`;
}
