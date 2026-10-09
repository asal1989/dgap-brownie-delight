import { PRODUCTS, CATEGORIES } from "../products.js";
import { h, hasPrice, priceLabel, formatPrice, toast, icon } from "../utils.js";
import { addProduct } from "../cart.js";
import { buildOrderMessage } from "../whatsapp.js";
import { openDialog } from "./dialog.js";
import { QuantityStepper } from "./QuantityStepper.js";
import { WhatsAppOrderButton } from "./WhatsAppOrderButton.js";

let current = null;

/** Product details dialog: gallery, sizes, price, ingredients, allergens, quantity, ordering, related items. */
export function openProduct(id, { updateHash = true } = {}) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return;
  current?.close();
  const body = h("div", { class: "pd" });
  const dlg = openDialog({
    wide: true,
    labelledBy: "pd-title",
    body,
    onClose: () => {
      current = null;
      if (updateHash && location.hash.startsWith("#product=")) history.replaceState(null, "", location.pathname + location.search + "#shop");
    },
  });
  current = dlg;
  render(product);
  if (updateHash) history.replaceState(null, "", `#product=${id}`);

  function render(p) {
    body.replaceChildren(content(p));
    dlg.el.scrollTop = 0;
  }

  function content(p) {
    const main = h("img", { class: "pd-main", src: p.images[0].src, alt: p.images[0].alt, width: 900, height: 1000 });
    const thumbs = p.images.map((im, i) =>
      h("button", {
        type: "button",
        class: "pd-thumb",
        "aria-label": `Show photo ${i + 1} of ${p.images.length}`,
        "aria-pressed": String(i === 0),
        onclick: () => {
          main.src = im.src;
          main.alt = im.alt;
          thumbs.forEach((t, j) => t.setAttribute("aria-pressed", String(j === i)));
        },
      }, h("img", { src: im.thumb, alt: "", loading: "lazy", width: 80, height: 80 })));

    const radios = p.sizes.map((s, i) => {
      const rid = `pd-size-${s.id}`;
      return h("label", { class: "size-opt", for: rid },
        h("input", { type: "radio", name: "pd-size", id: rid, value: s.id, checked: i === 0 }),
        h("span", { class: "size-card" }, h("strong", {}, s.label), h("span", {}, priceLabel(s.price))));
    });
    const sizeSet = h("fieldset", { class: "sizes" }, h("legend", {}, "Choose a size"), radios);
    const qty = QuantityStepper({ label: "Quantity", onChange: () => refresh() });
    const totalEl = h("p", { class: "pd-total", "aria-live": "polite" });
    const chosen = () => p.sizes.find((s) => s.id === sizeSet.querySelector("input:checked").value);
    function refresh() {
      const s = chosen();
      totalEl.textContent = hasPrice(s.price) ? `Subtotal: ${formatPrice(s.price * qty.get())}` : "Price on request. We'll confirm it on WhatsApp.";
    }
    sizeSet.addEventListener("change", refresh);
    refresh();

    const lines = () => {
      const s = chosen();
      return [{ name: p.name, size: s.label, qty: qty.get(), unit: s.price }];
    };
    const related = [
      ...PRODUCTS.filter((x) => x.id !== p.id && x.category === p.category),
      ...PRODUCTS.filter((x) => x.id !== p.id && x.category !== p.category),
    ].slice(0, 3);

    return h("div", {},
      h("div", { class: "pd-grid" },
        h("div", { class: "pd-gallery" }, h("div", { class: "pd-frame" }, main), thumbs.length > 1 ? h("div", { class: "pd-thumbs" }, thumbs) : null),
        h("div", { class: "pd-info" },
          h("p", { class: "eyebrow" }, CATEGORIES.find((c) => c.id === p.category)?.label),
          h("h2", { id: "pd-title", class: "pd-title" }, p.name),
          h("p", { class: "pd-desc" }, p.description),
          p.labels.length ? h("ul", { class: "labels" }, p.labels.map((l) => h("li", {}, l))) : null,
          sizeSet,
          h("div", { class: "pd-qty" }, h("span", { class: "label" }, "Quantity"), qty.el),
          totalEl,
          p.available
            ? h("div", { class: "pd-actions" },
                h("button", { type: "button", class: "btn btn-primary", onclick: () => { addProduct(p.id, chosen().id, qty.get()); toast(`${p.name} added to cart`); } }, icon("plus", 16), "Add to Cart"),
                WhatsAppOrderButton({ label: "Order on WhatsApp", getMessage: () => buildOrderMessage(lines()) }))
            : h("p", { class: "notice" }, "This brownie is currently unavailable."),
          h("dl", { class: "facts" },
            h("dt", {}, "Ingredients"),
            h("dd", {}, p.ingredients || "Full ingredient list available on request. Message us before ordering."),
            h("dt", {}, "Allergens"),
            h("dd", {}, p.allergens || "Allergen details are confirmed on request. If you have an allergy, please ask us before ordering.")))),
      related.length
        ? h("section", { class: "related", "aria-labelledby": "rel-title" },
            h("h3", { id: "rel-title" }, "You may also like"),
            h("div", { class: "related-row" }, related.map((r) =>
              h("button", { type: "button", class: "related-card", onclick: () => { render(r); if (updateHash) history.replaceState(null, "", `#product=${r.id}`); } },
                h("img", { src: r.images[0].thumb, alt: "", loading: "lazy", width: 120, height: 150 }),
                h("span", {}, r.name)))))
        : null);
  }
}
