import { h, icon } from "../utils.js";

let lastFocus = null;

/** Accessible modal dialog with focus trap, Escape and backdrop close. Returns { close, el }. */
export function openDialog({ title, body, actions = [], wide = false, labelledBy, onClose }) {
  lastFocus = document.activeElement;
  const titleId = labelledBy || "dlg-title-" + Math.random().toString(36).slice(2, 7);
  const closeBtn = h("button", { class: "icon-btn dlg-close", type: "button", "aria-label": "Close", onclick: () => close() }, icon("close", 22));
  const panel = h("div", { class: `dlg-panel${wide ? " wide" : ""}`, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, tabindex: "-1" },
    closeBtn,
    title ? h("h2", { id: titleId, class: "dlg-title" }, title) : null,
    h("div", { class: "dlg-body" }, body),
    actions.length ? h("div", { class: "dlg-actions" }, actions) : null,
  );
  const overlay = h("div", { class: "dlg-overlay", onmousedown: (e) => e.target === overlay && close() }, panel);
  document.body.append(overlay);
  document.documentElement.classList.add("no-scroll");
  requestAnimationFrame(() => { overlay.classList.add("open"); panel.focus(); });

  const onKey = (e) => {
    if (e.key === "Escape") return close();
    if (e.key !== "Tab") return;
    const f = [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", onKey);

  function close() {
    document.removeEventListener("keydown", onKey);
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
    document.documentElement.classList.remove("no-scroll");
    lastFocus?.focus?.();
    onClose?.();
  }
  return { close, el: panel };
}
