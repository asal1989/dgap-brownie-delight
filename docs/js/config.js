/**
 * DGAP Brownie Delight — site configuration.
 * Everything business-specific lives here so it can be edited without touching UI code.
 * Leave a value empty ("") to hide it. Nothing in this file has been verified by the
 * business unless you fill it in: empty fields intentionally render safe fallbacks.
 */
export const SITE = {
  brand: "DGAP Brownie Delight",
  tagline: "Handcrafted brownies in Bangalore",
  // Canonical URL of the deployed site (no trailing slash).
  url: "https://asal1989.github.io/dgap-brownie-delight",
  description:
    "Rich, fudgy, handcrafted brownies from DGAP Brownie Delight. Order brownies and brownie gift boxes in Bangalore on WhatsApp.",
  city: "Bangalore",
  currencySymbol: "₹",
  locale: "en-IN",
};

export const ANNOUNCEMENT = {
  enabled: true,
  message: "Handcrafted Brownies • Made with Love",
};

export const CONTACT = {
  // Digits only, with country code, e.g. "919876543210". Empty = WhatsApp buttons show a
  // "not set up yet" notice instead of opening a chat. Never put an unverified number here.
  whatsappNumber: "",
  phone: "",
  email: "",
  address: "",
  hours: "",
  fssai: "",
};

export const SOCIAL = {
  instagram: "", // e.g. "https://www.instagram.com/yourhandle"
  facebook: "",
};

export const NAV = [
  { label: "Home", href: "index.html#top" },
  { label: "Shop Brownies", href: "index.html#shop" },
  { label: "Gift Boxes", href: "index.html#gifting" },
  { label: "Our Story", href: "index.html#story" },
  { label: "Contact", href: "index.html#contact" },
];

export const HERO = {
  headline: "A Little Bite of Chocolate Heaven.",
  subtitle: "Rich, fudgy, irresistible brownies crafted to make every moment sweeter.",
  image: "images/hero-fudgie.jpg",
  imageAlt: "Close-up of rich, fudgy chocolate brownies",
};

/** Brownie box sizes for the custom box builder. `count` = brownies per box. `price: null` = not configured. */
export const BOX_SIZES = [
  { id: "box-4", label: "Box of 4", count: 4, price: null },
  { id: "box-6", label: "Box of 6", count: 6, price: null },
  { id: "box-9", label: "Box of 9", count: 9, price: null },
];

export const WHY = [
  { icon: "texture", title: "Rich, Fudgy Texture", text: "Baked for a dense, fudgy centre and a deep chocolate flavour." },
  { icon: "leaf", title: "Carefully Selected Ingredients", text: "We choose our ingredients with care. Ask us for the ingredient list of any brownie." },
  { icon: "oven", title: "Freshly Prepared Batches", text: "Brownies are prepared in batches, so confirm availability with us when you order." },
  { icon: "gift", title: "Perfect for Gifting", text: "Brownie boxes that make birthdays, festivals and thank-yous a little sweeter." },
];

export const OCCASIONS = [
  { title: "Birthday Gifts", text: "A box of brownies to make the day sweeter.", image: "images/triple-chocolate.jpg" },
  { title: "Anniversary Gifts", text: "Something indulgent to share.", image: "images/double-chocolate.jpg" },
  { title: "Festival Gifts", text: "Sweet gifts for festive moments.", image: "images/walnut-stack.jpg" },
  { title: "Corporate Gifting", text: "Gifts for teams and clients. Ask about larger orders.", image: "images/gift-box.jpg" },
  { title: "Custom Brownie Boxes", text: "Pick your own flavours and box size.", image: "images/tray.jpg", href: "#build-box" },
];

export const STORY = {
  title: "Baked by hand, made for sharing.",
  paragraphs: [
    "DGAP Brownie Delight is a Bangalore brownie bakery focused on one thing: rich, fudgy chocolate brownies made with care.",
    "Every brownie is crafted by hand, and every box is put together to be enjoyed or gifted. Add your own story here: who bakes, how it started, what makes your recipe special.",
  ],
  image: "images/tray.jpg",
  imageAlt: "A tray of freshly baked walnut brownies",
};

/** Real customer reviews only. Add objects like { name: "Asha", text: "…", rating: 5, product: "Classic Fudgy Brownie" }. */
export const REVIEWS = [];

/** Gallery photos. Each can link to a post once an Instagram URL is available: { src, alt, href }. */
export const GALLERY = [
  { src: "images/classic-fudgy.jpg", alt: "Classic fudgy brownies with crackly tops" },
  { src: "images/triple-chocolate.jpg", alt: "Brownies with chocolate sauce pouring over" },
  { src: "images/walnut.jpg", alt: "Chocolate brownie topped with walnut" },
  { src: "images/ragi.jpg", alt: "Dark chocolate brownies on a green plate" },
];

/**
 * FAQ answers are editable. Where the business has not confirmed a fact, the answer
 * says so honestly. Replace each with your real information.
 * `{flavours}` and `{whatsapp}` are filled in automatically.
 */
export const FAQS = [
  { q: "What brownie flavors are available?", a: "We bake {flavours}. Availability can change by day, so please confirm when you order." },
  { q: "Do you offer eggless brownies?", a: "Please message us on WhatsApp to ask about eggless options before you order. We'll confirm exactly what is available." },
  { q: "What sizes are available?", a: "Single brownies and boxes are available. Sizes shown on each product are what we offer; ask us if you need something different." },
  { q: "How can I place an order?", a: "Add brownies to your cart or build your own box, then tap “Order on WhatsApp”. We'll confirm availability, final price, delivery and payment with you." },
  { q: "Which Bangalore areas do you deliver to?", a: "Please share your area with us on WhatsApp and we'll confirm whether we can deliver there." },
  { q: "Do you accept bulk and custom orders?", a: "Yes, please message us on WhatsApp with what you need and the date. We'll confirm whether we can do it, along with pricing and timing." },
  { q: "How should brownies be stored?", a: "Store brownies in an airtight container, away from heat and direct sunlight. Ask us for storage advice specific to your order." },
];

export const ORDER_NOTE =
  "This is an order request. DGAP Brownie Delight will confirm availability, final charges, delivery and payment on WhatsApp.";

export const POLICIES = {
  delivery: "Delivery areas, charges and timing are confirmed on WhatsApp when you place your request.",
  privacy: "We only use the details you share on WhatsApp to process your order. We do not collect personal data on this website.",
  terms: "All orders are requests until DGAP Brownie Delight confirms availability, final charges, delivery and payment.",
};
