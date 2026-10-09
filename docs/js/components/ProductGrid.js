import { h } from "../utils.js";
import { ProductCard } from "./ProductCard.js";

/** Renders cards for `products`, with an empty state. Returns { el, update(list) }. */
export function ProductGrid({ products, onView }) {
  const grid = h("div", { class: "grid", id: "product-grid" });
  const status = h("p", { class: "sr-only", role: "status", "aria-live": "polite" });
  const el = h("div", {}, status, grid);
  function update(list) {
    grid.replaceChildren();
    if (!list.length) {
      grid.append(h("div", { class: "empty" }, h("h3", {}, "No brownies in this category yet"), h("p", {}, "Try another flavour, or message us to ask what's coming next.")));
    } else {
      list.forEach((p, i) => { const c = ProductCard(p, { onView }); c.style.setProperty("--i", i); c.classList.add("reveal-in"); grid.append(c); });
    }
    status.textContent = `${list.length} brownie${list.length === 1 ? "" : "s"} shown`;
  }
  update(products);
  return { el, update };
}
