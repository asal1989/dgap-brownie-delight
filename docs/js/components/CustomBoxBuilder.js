import { PRODUCTS } from "../products.js";
import { BOX_SIZES } from "../config.js";
import { h, formatPrice, hasPrice, icon, toast } from "../utils.js";
import { addBox } from "../cart.js";
import { buildOrderMessage, orderTotals } from "../whatsapp.js";
import { WhatsAppOrderButton } from "./WhatsAppOrderButton.js";

/** Build-your-own box: choose a size, fill it with flavours, see the summary, then add to cart or WhatsApp. */
export function CustomBoxBuilder() {
  const flavours = PRODUCTS.filter((p) => p.available);
  const state = { sizeId: BOX_SIZES[0].id, qty: Object.fromEntries(flavours.map((p) => [p.id, 0])) };
  const size = () => BOX_SIZES.find((s) => s.id === state.sizeId);
  const picked = () => Object.values(state.qty).reduce((a, b) => a + b, 0);

  const sizeSet = h("fieldset", { class: "sizes" },
    h("legend", {}, "1. Choose your box size"),
    BOX_SIZES.map((s, i) =>
      h("label", { class: "size-opt", for: `bx-${s.id}` },
        h("input", { type: "radio", name: "box-size", id: `bx-${s.id}`, value: s.id, checked: i === 0, onchange: () => { state.sizeId = s.id; trim(); refresh(); } }),
        h("span", { class: "size-card" }, h("strong", {}, s.label), h("span", {}, hasPrice(s.price) ? formatPrice(s.price) : `${s.count} brownies`)))));

  const rows = flavours.map((p) => {
    const out = h("output", { class: "bx-n" }, "0");
    const dec = h("button", { type: "button", class: "qty-btn", "aria-label": `Remove one ${p.name}`, onclick: () => step(p.id, -1) }, icon("minus", 16));
    const inc = h("button", { type: "button", class: "qty-btn", "aria-label": `Add one ${p.name}`, onclick: () => step(p.id, 1) }, icon("plus", 16));
    return {
      id: p.id, out, dec, inc,
      el: h("li", { class: "bx-row" },
        h("img", { src: p.images[0].thumb, alt: "", loading: "lazy", width: 56, height: 70 }),
        h("div", { class: "bx-name" }, h("strong", {}, p.name), h("span", { class: "muted" }, p.short)),
        h("div", { class: "qty" }, dec, out, inc)),
    };
  });

  const meterFill = h("span", { class: "meter-fill" });
  const meter = h("div", { class: "meter", role: "progressbar", "aria-label": "Box fill", "aria-valuemin": 0 }, meterFill);
  const meterText = h("p", { class: "meter-text", "aria-live": "polite" });
  const summary = h("div", { class: "bx-summary" });
  const err = h("p", { class: "form-error", role: "alert", hidden: true });

  function step(id, d) {
    const next = state.qty[id] + d;
    if (next < 0) return;
    if (d > 0 && picked() >= size().count) {
      err.hidden = false;
      err.textContent = `Your ${size().label.toLowerCase()} is full. Remove a brownie to add another flavour.`;
      return;
    }
    err.hidden = true;
    state.qty[id] = next;
    refresh();
  }
  /** When switching to a smaller box, drop surplus brownies from the end of the list. */
  function trim() {
    let extra = picked() - size().count;
    for (const p of [...flavours].reverse()) while (extra > 0 && state.qty[p.id] > 0) { state.qty[p.id]--; extra--; }
  }
  const picks = () => flavours.filter((p) => state.qty[p.id] > 0).map((p) => ({ productId: p.id, qty: state.qty[p.id] }));
  const line = () => ({
    name: "Custom Brownie Box",
    size: `${size().label} (${size().count} brownies)`,
    qty: 1,
    unit: size().price,
    extras: picks().map((p) => `${p.qty} × ${PRODUCTS.find((x) => x.id === p.productId).name}`),
  });

  function validate() {
    const left = size().count - picked();
    if (left > 0) {
      err.hidden = false;
      err.textContent = `Please pick ${left} more brownie${left === 1 ? "" : "s"} to fill your ${size().label.toLowerCase()}.`;
      return err.textContent;
    }
    err.hidden = true;
    return "";
  }

  function refresh() {
    const n = picked(), max = size().count;
    rows.forEach((r) => { r.out.textContent = state.qty[r.id]; r.dec.disabled = state.qty[r.id] === 0; r.inc.disabled = n >= max; });
    meter.setAttribute("aria-valuemax", max);
    meter.setAttribute("aria-valuenow", n);
    meterFill.style.width = `${(n / max) * 100}%`;
    meterText.textContent = n === max ? `Your box is full: ${max} of ${max}.` : `${n} of ${max} brownies chosen. ${max - n} to go.`;
    const l = line(), { subtotal } = orderTotals([l]);
    summary.replaceChildren(
      h("h3", {}, "Your box"),
      n ? h("ul", { class: "bx-picks" }, picks().map((p) => h("li", {}, `${p.qty} × ${PRODUCTS.find((x) => x.id === p.productId).name}`, h("button", { type: "button", class: "link-btn", "aria-label": `Remove ${PRODUCTS.find((x) => x.id === p.productId).name} from box`, onclick: () => { state.qty[p.productId] = 0; err.hidden = true; refresh(); } }, "Remove")))) : h("p", { class: "muted" }, "Nothing chosen yet. Add flavours with the + buttons."),
      h("p", { class: "cart-sub" }, h("span", {}, size().label), h("strong", {}, subtotal != null ? formatPrice(subtotal) : "Price to be confirmed")));
    if (n === max) err.hidden = true;
  }

  const actions = h("div", { class: "pd-actions stack" },
    h("button", { type: "button", class: "btn btn-primary", onclick: () => { if (validate()) return; addBox(state.sizeId, picks()); toast("Custom box added to cart"); } }, icon("plus", 16), "Add Box to Cart"),
    WhatsAppOrderButton({ label: "Order Box on WhatsApp", validate, getMessage: () => buildOrderMessage([line()]) }));

  const el = h("div", { class: "builder" },
    h("div", { class: "builder-main" },
      sizeSet,
      h("fieldset", { class: "flavours" }, h("legend", {}, "2. Pick your flavours"), meter, meterText, h("ul", { class: "bx-list" }, rows.map((r) => r.el)))),
    h("div", { class: "builder-side" }, summary, err, actions));
  refresh();
  return el;
}
