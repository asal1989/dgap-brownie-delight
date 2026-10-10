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
  { label: "Collection", href: "index.html#collection" },
  { label: "Shop", href: "index.html#shop" },
  { label: "Gift Boxes", href: "index.html#gifting" },
  { label: "Our Story", href: "index.html#story" },
  { label: "Contact", href: "index.html#contact" },
];

export const HERO = {
  eyebrow: "Artisan brownies · Bangalore",
  headline: "Where Every Bite Feels Homemade.",
  subtitle: "Indulgent brownies crafted to turn everyday moments into something special.",
  image: "images/hero-fudgie.jpg",
  imageAlt: "Close-up of rich, fudgy chocolate brownies",
  primary: { label: "Discover Our Brownies", href: "#collection" },
  secondary: { label: "Explore Gift Boxes", href: "#gifting" },
};

/** Brownie box sizes for the custom box builder. `count` = brownies per box. `price: null` = not configured. */
export const BOX_SIZES = [
  { id: "box-4", label: "Box of 4", count: 4, price: null },
  { id: "box-6", label: "Box of 6", count: 6, price: null },
  { id: "box-9", label: "Box of 9", count: 9, price: null },
];

/** Only claims the business can stand behind: facts drawn from the catalogue and how ordering works. */
export const WHY = [
  { icon: "oven", title: "Made by hand", text: "Every brownie is crafted by hand in Bangalore." },
  { icon: "texture", title: "Six signature flavours", text: "From Classic Fudgy to Ragi and Wheat, there is a brownie for every taste." },
  { icon: "gift", title: "Made for gifting", text: "Brownie boxes for birthdays, festivals and thank-yous, or build your own." },
  { icon: "chat", title: "Personal ordering", text: "Order on WhatsApp. We confirm availability, delivery and payment with you." },
];

export const OCCASIONS = [
  { title: "Birthday Gifts", text: "A box of brownies to make the day sweeter.", image: "images/triple-chocolate.jpg" },
  { title: "Anniversary Gifts", text: "Something indulgent to share.", image: "images/double-chocolate.jpg" },
  { title: "Festival Gifts", text: "Sweet gifts for festive moments.", image: "images/walnut-stack.jpg" },
  { title: "Corporate Gifting", text: "Gifts for teams and clients. Ask about larger orders.", image: "images/gift-box.jpg" },
  { title: "Custom Brownie Boxes", text: "Pick your own flavours and box size.", image: "images/tray.jpg", href: "#build-box" },
];

export const STORY = {
  eyebrow: "The DGAP signature",
  title: "Baked by hand, made for sharing.",
  paragraphs: [
    "DGAP Brownie Delight is a Bangalore brownie bakery focused on one thing: rich, fudgy chocolate brownies made with care.",
    "Every brownie is crafted by hand, and every box is put together to be enjoyed or gifted.",
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
  { src: "images/swirl-rack.jpg", alt: "Glossy chocolate brownies cooling on a rack" },
  { src: "images/golden-stack.jpg", alt: "Golden-topped brownies stacked high" },
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
