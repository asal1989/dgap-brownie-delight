import { SITE } from "./config.js";

/** Tiny DOM builder: h("div", {class:"x", onclick}, child, "text"). */
export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function formatPrice(n) {
  return SITE.currencySymbol + Number(n).toLocaleString(SITE.locale);
}

/** Price label for a size: "₹250" or "Ask for price". */
export function priceLabel(n) {
  return n == null ? "Ask for price" : formatPrice(n);
}

export const hasPrice = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0;
export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Inline SVG icons (stroke-based, inherit currentColor). */
const ICONS = {
  cart: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  texture: '<path d="M4 8c3-3 5 3 8 0s5 3 8 0M4 14c3-3 5 3 8 0s5 3 8 0"/>',
  leaf: '<path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l8-8"/>',
  oven: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M8 6.5h.01M12 6.5h.01"/><rect x="8" y="12" width="8" height="5" rx="1"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18v-3H3zM12 6v14M12 6c-1-3-5-3-5-1s3 1 5 1zM12 6c1-3 5-3 5-1s-3 1-5 1z"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.8 7.2h.01"/>',
  facebook: '<path d="M14 21v-8h3l.5-3.5H14V7.4c0-1 .4-1.7 1.8-1.7H17.6V2.6C17.3 2.5 16.3 2.4 15.200 2.4 12.800 2.4 10.500 3.900 10.500 6.800V9.500H7.500V13h3v8z"/>',
  mapPin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 10-14 0C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.5"/>',
};
export function icon(name, size = 20) {
  const wrap = document.createElement("span");
  wrap.className = "icon";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
  return wrap;
}

/** Live-region announcements for screen readers. */
export function announce(msg) {
  let r = document.getElementById("sr-live");
  if (!r) {
    r = h("div", { id: "sr-live", class: "sr-only", role: "status", "aria-live": "polite" });
    document.body.append(r);
  }
  r.textContent = "";
  setTimeout(() => (r.textContent = msg), 30);
}

/** Toast popup (non-blocking, auto-dismiss). */
export function toast(msg) {
  let box = document.getElementById("toasts");
  if (!box) {
    box = h("div", { id: "toasts", class: "toasts" });
    document.body.append(box);
  }
  const t = h("div", { class: "toast" }, msg);
  box.append(t);
  announce(msg);
  setTimeout(() => t.classList.add("out"), 2600);
  setTimeout(() => t.remove(), 3000);
}
