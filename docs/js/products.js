/**
 * Product catalogue — edit this file to change products, sizes, prices and labels.
 *
 * - `price: null` means "not configured": the site shows "Ask for price" and omits totals.
 *   Set a number (rupees) to switch pricing on for that size.
 * - `labels` are dietary/ingredient badges. Only add one once the business has verified it.
 * - `ingredients` / `allergens`: leave null until verified; a safe "ask us" note is shown.
 * - `available: false` greys the product out and blocks ordering.
 * - Sizes below are placeholders for structure; rename or change them to match what you sell.
 * - Photos are temporary stock images; replace `images` with your own product photography.
 */
export const CATEGORIES = [
  { id: "classic", label: "Classic Chocolate" },
  { id: "double", label: "Double Chocolate" },
  { id: "triple", label: "Triple Chocolate" },
  { id: "nuts", label: "Nuts Brownies" },
  { id: "ragi", label: "Ragi Brownies" },
  { id: "wheat", label: "Wheat Brownies" },
];

const SIZES = [
  { id: "single", label: "Single piece", price: null },
  { id: "box-4", label: "Box of 4", price: null },
  { id: "box-6", label: "Box of 6", price: null },
];
const sizes = () => SIZES.map((s) => ({ ...s }));

export const PRODUCTS = [
  {
    id: "classic-fudgy",
    name: "Classic Fudgy Brownie",
    category: "classic",
    short: "The one that started it all: dense, fudgy and deeply chocolatey.",
    description:
      "Our signature chocolate brownie with a rich, fudgy centre and a crackly top. Simple, indulgent and made for chocolate lovers.",
    images: [
      { src: "images/classic-fudgy.jpg", thumb: "images/classic-fudgy-sm.jpg", alt: "Freshly baked classic fudgy brownies with crackly tops on baking paper" },
      { src: "images/plate-stack.jpg", thumb: "images/plate-stack-sm.jpg", alt: "Stack of fudgy chocolate brownies on a plate" },
    ],
    sizes: sizes(),
    labels: [],
    ingredients: null,
    allergens: null,
    available: true,
    bestseller: true,
  },
  {
    id: "double-chocolate",
    name: "Double Chocolate Brownie",
    category: "double",
    short: "Twice the chocolate for a deeper, richer bite.",
    description: "A brownie built for serious chocolate fans, with a double dose of chocolate in every bite.",
    images: [
      { src: "images/double-chocolate.jpg", thumb: "images/double-chocolate-sm.jpg", alt: "Chocolate brownies drizzled with chocolate" },
      { src: "images/hero-fudgie.jpg", thumb: "images/hero-fudgie-sm.jpg", alt: "Close-up of a rich fudgy chocolate brownie" },
    ],
    sizes: sizes(),
    labels: [],
    ingredients: null,
    allergens: null,
    available: true,
    bestseller: true,
  },
  {
    id: "triple-chocolate",
    name: "Triple Chocolate Brownie",
    category: "triple",
    short: "Three layers of chocolate indulgence in one brownie.",
    description: "For the ultimate chocolate craving: a triple chocolate brownie that's rich, glossy and unapologetically decadent.",
    images: [
      { src: "images/triple-chocolate.jpg", thumb: "images/triple-chocolate-sm.jpg", alt: "Stack of brownies with chocolate sauce pouring over" },
      { src: "images/swirl-rack.jpg", thumb: "images/swirl-rack-sm.jpg", alt: "Glossy chocolate brownies cooling on a rack" },
    ],
    sizes: sizes(),
    labels: [],
    ingredients: null,
    allergens: null,
    available: true,
    bestseller: true,
  },
  {
    id: "chocolate-walnut",
    name: "Chocolate Walnut Brownie",
    category: "nuts",
    short: "Fudgy chocolate brownie with a satisfying walnut crunch.",
    description: "Rich chocolate brownie paired with walnuts for a contrast of fudgy and crunchy. Contains nuts.",
    images: [
      { src: "images/walnut.jpg", thumb: "images/walnut-sm.jpg", alt: "Chocolate brownie topped with a walnut half" },
      { src: "images/walnut-stack.jpg", thumb: "images/walnut-stack-sm.jpg", alt: "Stack of brownies topped with chopped walnuts" },
    ],
    sizes: sizes(),
    labels: ["Contains nuts"],
    ingredients: null,
    allergens: "Contains walnuts (tree nuts).",
    available: true,
    bestseller: false,
  },
  {
    id: "ragi",
    name: "Ragi Brownie",
    category: "ragi",
    short: "A brownie made with ragi (finger millet) flour.",
    description: "A chocolate brownie made with ragi, for a rustic twist on a favourite treat.",
    images: [
      { src: "images/ragi.jpg", thumb: "images/ragi-sm.jpg", alt: "Two dark chocolate brownies on a green plate" },
      { src: "images/fudge-stack.jpg", thumb: "images/fudge-stack-sm.jpg", alt: "Dense, dark brownie squares stacked together" },
    ],
    sizes: sizes(),
    labels: [],
    ingredients: null,
    allergens: null,
    available: true,
    bestseller: false,
  },
  {
    id: "wheat",
    name: "Wheat Brownie",
    category: "wheat",
    short: "A wholesome-style brownie made with wheat flour.",
    description: "A chocolate brownie made with wheat flour, for a slightly different bite with the same chocolate comfort.",
    images: [
      { src: "images/wheat.jpg", thumb: "images/wheat-sm.jpg", alt: "Pile of freshly baked brownies on a table" },
      { src: "images/golden-stack.jpg", thumb: "images/golden-stack-sm.jpg", alt: "Golden-topped brownies stacked high" },
    ],
    sizes: sizes(),
    labels: [],
    ingredients: null,
    allergens: null,
    available: true,
    bestseller: false,
  },
];
