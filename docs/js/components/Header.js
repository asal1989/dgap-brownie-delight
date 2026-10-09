import { ANNOUNCEMENT, NAV, SITE } from "../config.js";
import { h, icon, $ } from "../utils.js";
import { cartCount, subscribe } from "../cart.js";
import { openCart } from "./CartDrawer.js";

export function Header() {
  const root = h("div", { class: "site-top" });

  if (ANNOUNCEMENT.enabled && ANNOUNCEMENT.message) {
    root.append(h("div", { class: "announce", role: "region", "aria-label": "Announcement" }, h("p", {}, ANNOUNCEMENT.message)));
  }

  const badge = h("span", { class: "cart-badge", "aria-hidden": "true" }, "0");
  const cartBtn = h("button", { class: "icon-btn cart-btn", type: "button", onclick: () => openCart(), "aria-label": "Open cart" }, icon("cart", 24), badge);
  const sync = () => {
    const n = cartCount();
    badge.textContent = n;
    badge.classList.remove("bump"); void badge.offsetWidth; if (n) badge.classList.add("bump");
    badge.hidden = n === 0;
    cartBtn.setAttribute("aria-label", `Open cart, ${n} item${n === 1 ? "" : "s"}`);
  };
  subscribe(sync);
  sync();

  const links = NAV.map((l) => h("a", { href: l.href, class: "nav-link" }, l.label));
  const nav = h("nav", { id: "main-nav", class: "nav", "aria-label": "Main" }, links);
  const toggle = h("button", { class: "icon-btn menu-btn", type: "button", "aria-expanded": "false", "aria-controls": "main-nav", "aria-label": "Open menu" }, icon("menu", 26));
  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.documentElement.classList.toggle("menu-open", open);
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
  document.addEventListener("keydown", (e) => e.key === "Escape" && nav.classList.contains("open") && (setMenu(false), toggle.focus()));

  const header = h("header", { class: "header" },
    h("div", { class: "wrap header-row" },
      h("a", { href: "index.html#top", class: "logo", "aria-label": `${SITE.brand} home` },
        h("span", { class: "logo-mark", "aria-hidden": "true" }, "D"),
        h("span", { class: "logo-text" }, "DGAP ", h("em", {}, "Brownie Delight"))),
      nav,
      h("div", { class: "header-actions" },
        h("a", { href: "index.html#shop", class: "btn btn-primary btn-sm order-now" }, "Order Now"),
        cartBtn, toggle)));
  root.append(header);

  const onScroll = () => header.classList.toggle("scrolled", scrollY > 10);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Highlight the section in view on the home page.
  if ($("#shop")) {
    const map = new Map(links.map((a) => [a.getAttribute("href").split("#")[1], a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute("aria-current"));
        const a = map.get(en.target.id === "hero" ? "top" : en.target.id);
        if (a) a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["hero", "shop", "gifting", "story", "contact"].forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }
  return root;
}
