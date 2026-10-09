import { CATEGORIES } from "../products.js";
import { h, priceLabel, hasPrice, toast, icon } from "../utils.js";
import { addProduct } from "../cart.js";

/** Lowest configured price across sizes, or null. */
export function fromPrice(p) {
  const prices = p.sizes.map((s) => s.price).filter(hasPrice);
  return prices.length ? Math.min(...prices) : null;
}

export function ProductCard(p, { onView }) {
  const sel = h("select", { class: "select", id: `size-${p.id}`, "aria-label": `Size for ${p.name}` },
    p.sizes.map((s) => h("option", { value: s.id }, hasPrice(s.price) ? `${s.label} · ${priceLabel(s.price)}` : s.label)));
  const price = h("p", { class: "card-price", "aria-live": "polite" });
  const cur = () => p.sizes.find((s) => s.id === sel.value);
  const upd = () => { const s = cur(); price.textContent = hasPrice(s.price) ? priceLabel(s.price) : "Ask for price"; price.classList.toggle("muted", !hasPrice(s.price)); };
  sel.onchange = upd; upd();

  const view = () => onView(p.id);
  const card = h("article", { class: `card${p.available ? "" : " soldout"}`, "data-category": p.category },
    h("button", { class: "card-media", type: "button", onclick: view, "aria-label": `View details for ${p.name}` },
      h("img", { src: p.images[0].thumb, alt: p.images[0].alt, loading: "lazy", width: 640, height: 800, decoding: "async" }),
      p.bestseller ? h("span", { class: "tag" }, "Bestseller") : null,
      !p.available ? h("span", { class: "tag tag-dark" }, "Currently unavailable") : null),
    h("div", { class: "card-body" },
      h("p", { class: "eyebrow" }, CATEGORIES.find((c) => c.id === p.category)?.label),
      h("h3", { class: "card-title" }, p.name),
      h("p", { class: "card-desc" }, p.short),
      p.labels.length ? h("ul", { class: "labels", "aria-label": "Labels" }, p.labels.map((l) => h("li", {}, l))) : null,
      h("label", { class: "sr-only", for: `size-${p.id}` }, "Size"), sel, price,
      h("div", { class: "card-actions" },
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: view }, "View Details"),
        h("button", { class: "btn btn-primary btn-sm", type: "button", disabled: !p.available, onclick: () => {
          addProduct(p.id, sel.value, 1);
          toast(`${p.name} (${cur().label}) added to cart`);
        } }, icon("plus", 16), "Add to Cart"))));
  return card;
}
