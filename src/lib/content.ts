import { paymentMode } from "./env";
import type { Settings } from "./settings";

/** Fixed brand copy. Nothing here asserts an unverified fact (awards, guarantees, ingredient claims). */
export const BRAND = {
  tagline: "Where Every Bite Feels Homemade.",
  heroSub: "Indulgent brownies crafted to turn everyday moments into something special.",
  story: {
    title: "Baked by hand, made for sharing.",
    paragraphs: [
      "DGAP Brownie Delight is a Bangalore brownie bakery focused on one thing: rich, fudgy chocolate brownies made with care.",
      "Every brownie is crafted by hand, and every box is put together to be enjoyed or gifted.",
    ],
  },
  why: [
    { icon: "hand", title: "Made by hand", text: "Every brownie is crafted by hand in Bangalore." },
    { icon: "flavours", title: "Six signature flavours", text: "From Classic Fudgy to Ragi and Wheat, there is a brownie for every taste." },
    { icon: "gift", title: "Made for gifting", text: "Brownie boxes for birthdays, festivals and thank-yous, or build your own." },
    { icon: "chat", title: "Personal service", text: "Order online or message us on WhatsApp. We confirm delivery details with you." },
  ],
} as const;

export function buildFaqs(settings: Settings, flavourNames: string[]) {
  const flavours = flavourNames.length > 1 ? `${flavourNames.slice(0, -1).join(", ")} and ${flavourNames.at(-1)}` : flavourNames[0] ?? "our brownies";
  const mode = paymentMode();
  const pay: string[] = [];
  if (settings.onlinePaymentEnabled && mode === "razorpay") pay.push("online with Razorpay (UPI, cards and net banking)");
  if (settings.codEnabled) pay.push("cash on delivery");
  const zones = settings.deliveryZones.map((z) => z.name);

  return [
    { q: "Which brownie flavours do you make?", a: `We bake ${flavours}. Availability can change, so each product page shows what can be ordered right now.` },
    { q: "How do I place an order?", a: "Add brownies to your cart, or build your own box, then check out. If you prefer, you can send us your cart as a WhatsApp enquiry and we will confirm the details with you." },
    { q: "Do you offer eggless brownies?", a: "Please message us on WhatsApp to ask about eggless options before you order. We will confirm exactly what is available." },
    { q: "Where do you deliver?", a: zones.length ? `We currently deliver to: ${zones.join(", ")}. Delivery charges and timings are shown at checkout.` : "We bake and deliver in Bangalore. Enter your postal code at checkout and we will confirm delivery for your area." },
    { q: "How can I pay?", a: pay.length ? `You can pay ${pay.join(" or ")}.` : "Payment options are confirmed with you when you order." },
    { q: "Do you take bulk and custom orders?", a: "Yes. Message us on WhatsApp with what you need and the date, and we will confirm whether we can do it, along with pricing and timing." },
    { q: "What if I need to cancel or have a problem with my order?", a: "Please contact us as soon as possible. Our refund and cancellation policy explains how this works." },
  ];
}
