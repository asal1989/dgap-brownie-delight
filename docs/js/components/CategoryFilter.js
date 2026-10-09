import { h } from "../utils.js";

/** Radio-style filter tabs. `counts` maps category id → number. */
export function CategoryFilter({ categories, counts, onChange }) {
  const all = [{ id: "all", label: "All Brownies" }, ...categories];
  const btns = all.map((c) => h("button", { type: "button", class: "chip", "aria-pressed": String(c.id === "all"), "data-id": c.id,
    onclick: () => select(c.id) }, c.label, h("span", { class: "chip-count" }, ` ${c.id === "all" ? counts.all : counts[c.id] || 0}`)));
  const el = h("div", { class: "chips", role: "group", "aria-label": "Filter brownies by category" }, btns);
  function select(id, silent) {
    btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
    if (!silent) onChange(id);
  }
  return { el, select };
}
