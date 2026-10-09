import { h, icon, formatPrice, hasPrice, toast } from "../utils.js";
import { cartLines, setQty, clearCart, subscribe } from "../cart.js";
import { buildOrderMessage, orderTotals } from "../whatsapp.js";
import { ORDER_NOTE } from "../config.js";
import { WhatsAppOrderButton } from "./WhatsAppOrderButton.js";
import { QuantityStepper } from "./QuantityStepper.js";

let open = null;

/** Slide-in cart with quantity editing, honest totals and WhatsApp checkout. */
export function openCart() {
  if (open) return;
  const body = h("div", { class: "cart" });
  const overlay = h("div", { class: "drawer-overlay", onmousedown: (e) => e.target === overlay && close() });
  const panel = h("aside", { class: "drawer", role: "dialog", "aria-modal": "true", "aria-label": "Your cart", tabindex: "-1" },
    h("div", { class: "drawer-head" },
      h("h2", {}, "Your Cart"),
      h("button", { class: "icon-btn", type: "button", "aria-label": "Close cart", onclick: () => close() }, icon("close", 22))),
    body);
  overlay.append(panel);
  const prev = document.activeElement;
  document.body.append(overlay);
  document.documentElement.classList.add("no-scroll");
  requestAnimationFrame(() => { overlay.classList.add("open"); panel.focus(); });

  const unsub = subscribe(render);
  const onKey = (e) => e.key === "Escape" && close();
  document.addEventListener("keydown", onKey);
  function close() {
    unsub();
    document.removeEventListener("keydown", onKey);
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 220);
    document.documentElement.classList.remove("no-scroll");
    open = null;
    prev?.focus?.();
  }
  open = { close };

  function render() {
    const lines = cartLines();
    body.replaceChildren();
    if (!lines.length) {
      body.append(h("div", { class: "empty" },
        h("h3", {}, "Your cart is empty"),
        h("p", {}, "Add a brownie or build your own box to get started."),
        h("a", { class: "btn btn-primary", href: "index.html#shop", onclick: () => close() }, "Browse Brownies")));
      return;
    }
    const { subtotal, allPriced } = orderTotals(lines);
    body.append(
      h("ul", { class: "cart-list" }, lines.map((l) => {
        const q = QuantityStepper({ value: l.qty, min: 0, label: `Quantity of ${l.name}`, onChange: (n) => setQty(l.key, n) });
        return h("li", { class: "cart-line" },
          h("img", { src: l.image, alt: "", width: 64, height: 80 }),
          h("div", { class: "cart-info" },
            h("strong", {}, l.name),
            h("span", { class: "muted" }, l.size),
            l.extras ? h("ul", { class: "extras" }, l.extras.map((e) => h("li", {}, e))) : null,
            h("span", { class: "cart-price" }, hasPrice(l.unit) ? `${formatPrice(l.unit)} × ${l.qty} = ${formatPrice(l.unit * l.qty)}` : "Price to be confirmed"),
            l.available === false ? h("span", { class: "warn" }, "Currently unavailable: we'll confirm on WhatsApp") : null),
          h("div", { class: "cart-ctl" }, q.el, h("button", { class: "link-btn", type: "button", onclick: () => setQty(l.key, 0), "aria-label": `Remove ${l.name} from cart` }, "Remove")));
      })),
      h("div", { class: "cart-foot" },
        h("p", { class: "cart-sub" }, h("span", {}, "Subtotal"), h("strong", {}, allPriced ? formatPrice(subtotal) : "To be confirmed")),
        h("p", { class: "fine" }, ORDER_NOTE),
        WhatsAppOrderButton({ label: "Send Order on WhatsApp", full: true, getMessage: () => buildOrderMessage(cartLines()) }),
        h("button", { class: "link-btn", type: "button", onclick: () => { clearCart(); toast("Cart cleared"); } }, "Clear cart")));
  }
  render();
}
