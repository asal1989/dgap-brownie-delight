import { HERO, WHY, OCCASIONS, STORY, REVIEWS, GALLERY, FAQS, CONTACT, SOCIAL, SITE, POLICIES, ORDER_NOTE } from "../config.js";
import { PRODUCTS } from "../products.js";
import { h, icon } from "../utils.js";
import { WhatsAppOrderButton } from "./WhatsAppOrderButton.js";
import { buildEnquiryMessage } from "../whatsapp.js";
import { openDialog } from "./dialog.js";

const heading = (eyebrow, title, sub, id) =>
  h("header", { class: "section-head reveal" },
    h("p", { class: "eyebrow" }, eyebrow),
    h("h2", { id }, title),
    sub ? h("p", { class: "section-sub" }, sub) : null);

export function Hero() {
  return h("section", { class: "hero", id: "hero", "aria-labelledby": "hero-title" },
    h("div", { class: "hero-bg", "aria-hidden": "true" }),
    h("div", { class: "wrap hero-grid" },
      h("div", { class: "hero-copy" },
        h("p", { class: "eyebrow gold hero-in", style: "--d:0" }, "Handcrafted in ", SITE.city),
        h("h1", { id: "hero-title", class: "hero-in", style: "--d:1" }, HERO.headline),
        h("p", { class: "hero-sub hero-in", style: "--d:2" }, HERO.subtitle),
        h("div", { class: "hero-cta hero-in", style: "--d:3" },
          h("a", { href: "#shop", class: "btn btn-gold btn-lg" }, "Explore Our Brownies", icon("arrow", 18)),
          WhatsAppOrderButton({ label: "Order on WhatsApp", variant: "outline-light", getMessage: () => buildEnquiryMessage("I'd like to order brownies.") }))),
      h("div", { class: "hero-media hero-in", style: "--d:2" },
        h("img", { src: HERO.image, alt: HERO.imageAlt, width: 1200, height: 1500, fetchpriority: "high" }))));
}

export function WhySection() {
  return h("section", { class: "section why", "aria-labelledby": "why-title" },
    h("div", { class: "wrap" },
      heading("Why DGAP", "Why Choose Us?", "Made for people who take their chocolate seriously.", "why-title"),
      h("ul", { class: "why-grid" }, WHY.map((w, i) =>
        h("li", { class: "why-item reveal", style: `--i:${i}` },
          h("span", { class: "why-icon" }, icon(w.icon, 28)),
          h("h3", {}, w.title),
          h("p", {}, w.text))))));
}

export function GiftSection() {
  const prefill = (o) => buildEnquiryMessage(`I'd like to enquire about a brownie gift box for ${o ? o.toLowerCase() : "an occasion"}.`);
  return h("section", { class: "section gifting", id: "gifting", "aria-labelledby": "gift-title" },
    h("div", { class: "wrap" },
      heading("Gift Boxes", "Brownie Boxes for Every Occasion", "Premium boxes, packed to be gifted.", "gift-title"),
      h("ul", { class: "gift-grid" }, OCCASIONS.map((o, i) =>
        h("li", { class: "gift-card reveal", style: `--i:${i}` },
          h("img", { src: o.image, alt: "", loading: "lazy", width: 600, height: 760 }),
          h("div", { class: "gift-body" },
            h("h3", {}, o.title),
            h("p", {}, o.text),
            WhatsAppOrderButton({ label: "Enquire on WhatsApp", variant: "outline-light", getMessage: () => prefill(o.title) })))))));
}

export function StorySection() {
  return h("section", { class: "section story", id: "story", "aria-labelledby": "story-title" },
    h("div", { class: "wrap story-grid" },
      h("div", { class: "story-media reveal" }, h("img", { src: STORY.image, alt: STORY.imageAlt, loading: "lazy", width: 900, height: 700 })),
      h("div", { class: "story-copy reveal" },
        h("p", { class: "eyebrow" }, "Our Story"),
        h("h2", { id: "story-title" }, STORY.title),
        STORY.paragraphs.map((p) => h("p", {}, p)),
        h("a", { class: "btn btn-primary", href: "about.html" }, "Read our story", icon("arrow", 18)))));
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
        : h("p", { class: "center muted" }, "Our Instagram profile link will appear here soon.")));
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

export function FinalCTA() {
  return h("section", { class: "final", "aria-labelledby": "cta-title" },
    h("div", { class: "wrap final-in reveal" },
      h("h2", { id: "cta-title" }, "Your Next Chocolate Craving Starts Here."),
      h("div", { class: "hero-cta center-row" },
        h("a", { href: "#shop", class: "btn btn-gold btn-lg" }, "Explore Brownies"),
        WhatsAppOrderButton({ label: "Order on WhatsApp", variant: "outline-light", getMessage: () => buildEnquiryMessage("I'd like to order brownies.") }))));
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
      h("div", {}, h("h3", {}, "Ordering"), h("p", {}, "Order via WhatsApp or the cart. ", ORDER_NOTE)),
      h("div", {}, h("h3", {}, "Policies"), h("ul", {}, [policyLink("Delivery policy", POLICIES.delivery), policyLink("Privacy policy", POLICIES.privacy), policyLink("Terms", POLICIES.terms)].map((l) => h("li", {}, l))))),
    h("div", { class: "wrap foot-base" }, h("p", {}, `© ${new Date().getFullYear()} ${SITE.brand}. All rights reserved.`)));
}
