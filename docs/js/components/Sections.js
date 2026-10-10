import { HERO, WHY, OCCASIONS, STORY, REVIEWS, GALLERY, FAQS, CONTACT, SOCIAL, SITE, POLICIES, ORDER_NOTE } from "../config.js";
import { PRODUCTS, CATEGORIES } from "../products.js";
import { h, icon, priceLabel } from "../utils.js";
import { fromPrice } from "./ProductCard.js";
import { WhatsAppOrderButton } from "./WhatsAppOrderButton.js";
import { buildEnquiryMessage, whatsappReady, whatsappUrl } from "../whatsapp.js";
import { openDialog } from "./dialog.js";

const heading = (eyebrow, title, sub, id) =>
  h("header", { class: "section-head reveal" },
    h("p", { class: "eyebrow" }, eyebrow),
    h("h2", { id }, title),
    sub ? h("p", { class: "section-sub" }, sub) : null);

export function Hero() {
  return h("section", { class: "hero", id: "hero", "aria-labelledby": "hero-title" },
    h("div", { class: "hero-copy" },
      h("p", { class: "eyebrow hero-in", style: "--d:0" }, HERO.eyebrow),
      h("h1", { id: "hero-title", class: "hero-in", style: "--d:1" }, HERO.headline),
      h("p", { class: "hero-sub hero-in", style: "--d:2" }, HERO.subtitle),
      h("div", { class: "hero-cta hero-in", style: "--d:3" },
        h("a", { href: HERO.primary.href, class: "btn btn-gold btn-lg" }, HERO.primary.label),
        h("a", { href: HERO.secondary.href, class: "btn btn-outline-light btn-lg" }, HERO.secondary.label))),
    h("div", { class: "hero-media hero-in", style: "--d:1" },
      h("img", { src: HERO.image, alt: HERO.imageAlt, width: 1200, height: 1500, fetchpriority: "high" })));
}

/** Signature collection: one editorial tile per configured brownie, with real sizes and prices. */
export function Collection({ onView }) {
  return h("section", { class: "section collection", id: "collection", "aria-labelledby": "col-title" },
    h("div", { class: "wrap" },
      heading("The Signature Collection", "Six Brownies, Baked by Hand", "Choose a favourite, or taste your way through all six.", "col-title"),
      h("ul", { class: "tile-grid" }, PRODUCTS.map((p, i) => {
        const from = fromPrice(p);
        return h("li", { class: "tile reveal", style: `--i:${i % 3}` },
          h("button", { type: "button", class: "tile-media", onclick: () => onView(p.id), "aria-label": `View details for ${p.name}` },
            h("img", { src: p.images[0].src, alt: p.images[0].alt, loading: "lazy", width: 640, height: 800, decoding: "async" }),
            !p.available ? h("span", { class: "tag tag-dark" }, "Currently unavailable") : p.bestseller ? h("span", { class: "tag" }, "Bestseller") : null),
          h("div", { class: "tile-body" },
            h("p", { class: "eyebrow" }, CATEGORIES.find((c) => c.id === p.category)?.label),
            h("h3", {}, p.name),
            h("p", { class: "tile-sizes" }, p.sizes.map((s) => s.label).join(" · ")),
            h("p", { class: `tile-price${from == null ? " muted" : ""}` }, from == null ? priceLabel(null) : `From ${priceLabel(from)}`),
            h("button", { type: "button", class: "more", onclick: () => onView(p.id) }, "View details", icon("arrow", 16))));
      }))));
}

export function WhySection() {
  return h("section", { class: "section why", "aria-labelledby": "why-title" },
    h("div", { class: "wrap" },
      heading("Why DGAP", "Made With Care", null, "why-title"),
      h("ul", { class: "why-grid" }, WHY.map((w, i) =>
        h("li", { class: "why-item reveal", style: `--i:${i}` },
          h("span", { class: "why-icon" }, icon(w.icon, 26)),
          h("h3", {}, w.title),
          h("p", {}, w.text))))));
}

export function GiftSection() {
  const prefill = (o) => buildEnquiryMessage(`I'd like to enquire about a brownie gift box for ${o ? o.toLowerCase() : "an occasion"}.`);
  return h("section", { class: "section gifting", id: "gifting", "aria-labelledby": "gift-title" },
    h("div", { class: "wrap" },
      heading("Luxury Gifting", "Brownie Boxes for Every Occasion", "Thoughtfully packed, ready to be gifted.", "gift-title"),
      h("ul", { class: "gift-grid" }, OCCASIONS.map((o, i) =>
        h("li", { class: "gift-card reveal", style: `--i:${i}` },
          h("img", { src: o.image, alt: "", loading: "lazy", width: 600, height: 760 }),
          h("div", { class: "gift-body" },
            h("h3", {}, o.title),
            h("p", {}, o.text),
            WhatsAppOrderButton({ label: "Enquire on WhatsApp", variant: "outline-light", getMessage: () => prefill(o.title) }),
            o.href ? h("a", { class: "link-btn", href: o.href }, "Build your box") : null))))));
}

/** Deep-green signature brand section with a large photograph and the short brand story. */
export function StorySection() {
  return h("section", { class: "signature", id: "story", "aria-labelledby": "story-title" },
    h("div", { class: "wrap signature-grid" },
      h("div", { class: "signature-media reveal" }, h("img", { src: STORY.image, alt: STORY.imageAlt, loading: "lazy", width: 1400, height: 935 })),
      h("div", { class: "signature-copy reveal" },
        h("p", { class: "eyebrow" }, STORY.eyebrow),
        h("h2", { id: "story-title" }, STORY.title),
        h("span", { class: "rule", "aria-hidden": "true" }),
        STORY.paragraphs.map((p) => h("p", {}, p)),
        h("a", { class: "btn btn-gold", href: "about.html" }, "Read our story"))));
}

export function Testimonials() {
  const body = REVIEWS.length
    ? h("ul", { class: "reviews" }, REVIEWS.map((r) =>
        h("li", { class: "review reveal" },
          r.rating ? h("p", { class: "stars", role: "img", "aria-label": `${r.rating} out of 5 stars` }, "★".repeat(r.rating) + "☆".repeat(5 - r.rating)) : null,
          h("blockquote", {}, `“${r.text}”`),
          h("p", { class: "review-by" }, r.name, r.product ? ` · ${r.product}` : ""))))
    : h("div", { class: "empty reveal" },
        h("h3", {}, "Reviews are coming soon"),
        h("p", {}, "We only show genuine customer feedback. Tried our brownies? We'd love to hear from you on WhatsApp."),
        WhatsAppOrderButton({ label: "Share your feedback", variant: "outline", getMessage: () => buildEnquiryMessage("I'd like to share feedback about my brownies.") }));
  return h("section", { class: "section reviews-sec", "aria-labelledby": "rev-title" },
    h("div", { class: "wrap" }, heading("Customer Love", "What Our Customers Say", null, "rev-title"), body));
}

export function GallerySection() {
  const link = SOCIAL.instagram;
  return h("section", { class: "section gallery", "aria-labelledby": "gal-title" },
    h("div", { class: "wrap" },
      heading("Instagram", "Fresh From Our Kitchen", "A little look at what we bake.", "gal-title"),
      h("ul", { class: "gal-grid" }, GALLERY.map((g, i) => {
        const img = h("img", { src: g.src.replace(".jpg", "-sm.jpg"), alt: g.alt, loading: "lazy", width: 480, height: 480 });
        return h("li", { class: "reveal", style: `--i:${i}` }, g.href || link ? h("a", { href: g.href || link, target: "_blank", rel: "noopener", "aria-label": `${g.alt} (opens Instagram)` }, img) : img);
      })),
      link
        ? h("p", { class: "center" }, h("a", { class: "btn btn-outline", href: link, target: "_blank", rel: "noopener" }, icon("instagram", 18), "Follow us on Instagram"))
        : null));
}

export function FAQSection() {
  const flavours = PRODUCTS.map((p) => p.name).join(", ").replace(/, ([^,]*)$/, " and $1");
  const fill = (t) => t.replaceAll("{flavours}", flavours);
  return h("section", { class: "section faq", id: "faq", "aria-labelledby": "faq-title" },
    h("div", { class: "wrap narrow" },
      heading("FAQ", "Frequently Asked Questions", null, "faq-title"),
      h("div", { class: "faq-list" }, FAQS.map((f, i) =>
        h("details", { class: "faq-item reveal", style: `--i:${i}` },
          h("summary", {}, h("span", {}, f.q), icon("plus", 18)),
          h("p", {}, fill(f.a)))))));
}

export function ContactSection() {
  const rows = [
    CONTACT.phone && ["Phone", h("a", { href: `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}` }, CONTACT.phone)],
    CONTACT.email && ["Email", h("a", { href: `mailto:${CONTACT.email}` }, CONTACT.email)],
    CONTACT.address && ["Address", CONTACT.address],
    CONTACT.hours && ["Hours", CONTACT.hours],
    CONTACT.fssai && ["FSSAI", CONTACT.fssai],
  ].filter(Boolean);
  return h("section", { class: "section contact", id: "contact", "aria-labelledby": "contact-title" },
    h("div", { class: "wrap narrow center" },
      heading("Contact", "Let's Talk Brownies", "The fastest way to order or ask a question is WhatsApp.", "contact-title"),
      WhatsAppOrderButton({ label: "Message us on WhatsApp", getMessage: () => buildEnquiryMessage("I have a question about your brownies.") }),
      rows.length ? h("dl", { class: "contact-list" }, rows.map(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])) : null,
      h("p", { class: "muted fine" }, `Serving ${SITE.city}. Please share your area when you message us so we can confirm delivery.`)));
}

function policyLink(label, text) {
  return h("button", { type: "button", class: "foot-link", onclick: () => openDialog({ title: label, body: [h("p", {}, text)] }) }, label);
}

export function Footer() {
  const social = [
    SOCIAL.instagram && h("a", { href: SOCIAL.instagram, target: "_blank", rel: "noopener", class: "icon-btn", "aria-label": "Instagram" }, icon("instagram", 22)),
    SOCIAL.facebook && h("a", { href: SOCIAL.facebook, target: "_blank", rel: "noopener", class: "icon-btn", "aria-label": "Facebook" }, icon("facebook", 22)),
  ].filter(Boolean);
  return h("footer", { class: "footer" },
    h("div", { class: "wrap foot-grid" },
      h("div", {}, h("p", { class: "foot-brand" }, "DGAP ", h("em", {}, "Brownie Delight")), h("p", {}, SITE.tagline + "."), social.length ? h("div", { class: "social" }, social) : null),
      h("nav", { "aria-label": "Footer" }, h("h3", {}, "Explore"),
        h("ul", {}, [["Shop Brownies", "index.html#shop"], ["Gift Boxes", "index.html#gifting"], ["Our Story", "about.html"], ["FAQ", "index.html#faq"], ["Contact", "index.html#contact"]]
          .map(([l, href]) => h("li", {}, h("a", { href }, l))))),
      h("div", {}, h("h3", {}, "Ordering"), h("p", {}, "Order via WhatsApp or the cart. ", ORDER_NOTE), whatsappReady() ? h("p", {}, h("a", { href: whatsappUrl(buildEnquiryMessage("I have a question about your brownies.")), target: "_blank", rel: "noopener" }, "Chat on WhatsApp")) : null, CONTACT.phone ? h("p", {}, h("a", { href: `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}` }, CONTACT.phone)) : null, CONTACT.email ? h("p", {}, h("a", { href: `mailto:${CONTACT.email}` }, CONTACT.email)) : null),
      h("div", {}, h("h3", {}, "Delivery"), h("p", {}, POLICIES.delivery), h("h3", { class: "foot-sub" }, "Policies"), h("ul", {}, [policyLink("Privacy policy", POLICIES.privacy), policyLink("Terms", POLICIES.terms)].map((l) => h("li", {}, l))))),
    h("div", { class: "wrap foot-base" }, h("p", {}, `© ${new Date().getFullYear()} ${SITE.brand}. All rights reserved.`)));
}
