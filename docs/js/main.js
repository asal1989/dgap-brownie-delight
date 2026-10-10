import { SITE, SOCIAL, CONTACT } from "./config.js";
import { PRODUCTS, CATEGORIES } from "./products.js";
import { $, h, prefersReducedMotion } from "./utils.js";
import { Header } from "./components/Header.js";
import { ProductGrid } from "./components/ProductGrid.js";
import { CategoryFilter } from "./components/CategoryFilter.js";
import { openProduct } from "./components/ProductModal.js";
import { CustomBoxBuilder } from "./components/CustomBoxBuilder.js";
import { Hero, Collection, WhySection, GiftSection, StorySection, Testimonials, GallerySection, FAQSection, ContactSection, Footer } from "./components/Sections.js";

function shopSection() {
  const counts = { all: PRODUCTS.length };
  PRODUCTS.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
  const grid = ProductGrid({ products: PRODUCTS, onView: (id) => openProduct(id) });
  const filter = CategoryFilter({
    categories: CATEGORIES,
    counts,
    onChange: (id) => grid.update(id === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === id)),
  });
  return h("section", { class: "section shop", id: "shop", "aria-labelledby": "shop-title" },
    h("div", { class: "wrap" },
      h("header", { class: "section-head reveal" },
        h("p", { class: "eyebrow" }, "Shop Brownies"),
        h("h2", { id: "shop-title" }, "Shop by Flavour"),
        h("p", { class: "section-sub" }, "Choose your brownie by flavour, then pick a size.")),
      filter.el,
      grid.el));
}

function boxSection() {
  return h("section", { class: "section box", id: "build-box", "aria-labelledby": "box-title" },
    h("div", { class: "wrap" },
      h("header", { class: "section-head reveal" },
        h("p", { class: "eyebrow" }, "Custom Box"),
        h("h2", { id: "box-title" }, "Build Your Own Brownie Box"),
        h("p", { class: "section-sub" }, "Choose a size, mix your favourite flavours and send your box straight to us.")),
      CustomBoxBuilder()));
}

/** Structured data only for information the business has supplied in config.js. */
function structuredData() {
  const data = { "@context": "https://schema.org", "@type": "Bakery", name: SITE.brand, url: SITE.url + "/", description: SITE.description, areaServed: SITE.city };
  const same = [SOCIAL.instagram, SOCIAL.facebook].filter(Boolean);
  if (same.length) data.sameAs = same;
  if (CONTACT.phone) data.telephone = CONTACT.phone;
  if (CONTACT.email) data.email = CONTACT.email;
  if (CONTACT.address) data.address = { "@type": "PostalAddress", streetAddress: CONTACT.address, addressCountry: "IN" };
  document.head.append(h("script", { type: "application/ld+json" }, JSON.stringify(data)));
}

function reveal() {
  const els = document.querySelectorAll(".reveal");
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("in"));
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }),
    { rootMargin: "0px 0px -8% 0px" },
  );
  els.forEach((e) => io.observe(e));
}

function route() {
  const m = location.hash.match(/^#product=([\w-]+)/);
  if (m) openProduct(m[1], { updateHash: false });
}

const page = document.body.dataset.page;

/** Render the app. If anything throws, keep the static menu that ships inside index.html visible. */
function start() {
  if (page === "home") {
    const onView = (id) => openProduct(id);
    $("#app").replaceChildren(Hero(), Collection({ onView }), shopSection(), StorySection(), boxSection(), GiftSection(), WhySection(), Testimonials(), GallerySection(), FAQSection(), ContactSection());
    structuredData();
  }
  $("#site-header").replaceChildren(Header());
  $("#site-footer").replaceChildren(Footer());
  document.documentElement.classList.add("js-ready");
  reveal();
  if (page === "home") {
    route();
    addEventListener("hashchange", route);
    // Honour a deep link such as /#shop now that the sections exist.
    if (location.hash && !location.hash.startsWith("#product=")) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
}
try {
  start();
} catch (err) {
  console.error("DGAP Brownie Delight failed to start:", err);
  document.documentElement.classList.add("js-failed");
}

// Fallback for any image that fails to load (no broken-image icons).
const FALLBACK = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#F8F2E8"/><text x="200" y="260" text-anchor="middle" font-family="Georgia,serif" font-size="28" fill="#183A2C">DGAP Brownie Delight</text></svg>');
document.addEventListener("error", (e) => {
  const t = e.target;
  if (t.tagName === "IMG" && t.src !== FALLBACK) t.src = FALLBACK;
}, true);
