import type { Settings } from "./settings";
import { formatINR } from "./money";

export type PolicyKey = "shipping" | "refunds" | "privacy" | "terms";

export const POLICY_TITLES: Record<PolicyKey, string> = {
  shipping: "Shipping & delivery",
  refunds: "Refunds & cancellation",
  privacy: "Privacy policy",
  terms: "Terms & conditions",
};

/**
 * Policy text shown on the public policy pages. If an admin has written a policy in Settings it is used
 * verbatim. Otherwise a factual default is shown: it only describes how this website actually behaves and
 * invents no commitments (no refund windows, delivery guarantees or timings).
 * Blank lines separate paragraphs; a line starting with "# " is a heading.
 */
export function policyText(key: PolicyKey, s: Settings): string {
  const custom = s.policies[key].trim();
  if (custom) return custom;

  switch (key) {
    case "shipping": {
      const options = s.deliveryOptions.filter((o) => o.enabled).map((o) => `${o.label}: ${formatINR(o.feePaise)}`);
      const zones = s.deliveryZones.map((z) => `${z.name}: ${formatINR(z.feePaise)}`);
      return [
        "# Where we deliver",
        "We bake and deliver in Bangalore. Enter your postal code at checkout and we will confirm whether we can deliver to your area.",
        options.length ? `# Delivery options\n${options.join("\n")}` : "",
        zones.length ? `# Delivery zones\n${zones.join("\n")}` : "",
        s.freeDeliveryThresholdPaise != null ? `Delivery is free on orders of ${formatINR(s.freeDeliveryThresholdPaise)} or more.` : "",
        "# Timing",
        "Delivery timing is confirmed with you when you order. If you need your brownies by a particular date, please tell us in the delivery instructions or message us before ordering.",
      ].filter(Boolean).join("\n\n");
    }
    case "refunds":
      return [
        "# Cancellations and problems with an order",
        "Please contact us as soon as possible if you need to cancel an order or if something is wrong with it. We review each request and reply with the options available.",
        "# Refunds",
        "When a refund is approved for an online payment, it is returned to the original payment method. It can take a few working days to appear in your account, depending on your bank.",
        "Refunds are issued by our team after review. They are never automatic.",
        "# Contact",
        "Use the contact page or message us on WhatsApp with your order number.",
      ].join("\n\n");
    case "privacy":
      return [
        "# What we collect",
        "To process an order we collect your name, phone number, delivery address and, if you give it, your email address. If you create an account we also store your email and a securely hashed password.",
        "# Payments",
        "Online payments are handled by Razorpay. We never see or store your card details.",
        "# Cookies",
        "We use a cookie to keep you signed in, and a cookie that lets the browser that placed an order view it. We do not use advertising cookies.",
        "# Newsletter",
        "We email you news only if you tick the consent box when subscribing, and you can unsubscribe at any time.",
        "# Your data",
        "Contact us if you would like a copy of your data corrected or removed.",
      ].join("\n\n");
    case "terms":
      return [
        "# Orders",
        "Placing an order is a request to buy. An order is confirmed when payment is received (or, for cash on delivery, when we accept it). We may need to contact you to confirm availability and delivery details.",
        "# Prices",
        "Prices are in Indian rupees. The price you see at checkout is the price you pay, including any delivery charge shown.",
        "# Allergens",
        "If you have an allergy, please ask us about ingredients and allergens before ordering.",
        "# Contact",
        "Questions about these terms? Use the contact page.",
      ].join("\n\n");
  }
}
