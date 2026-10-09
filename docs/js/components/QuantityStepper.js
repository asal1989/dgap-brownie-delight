import { h, icon } from "../utils.js";

/** Accessible quantity stepper. Returns { el, get, set }. */
export function QuantityStepper({ value = 1, min = 1, max = 99, label = "Quantity", onChange }) {
  let v = value;
  const input = h("input", { type: "number", inputmode: "numeric", min, max, value: v, class: "qty-input", "aria-label": label });
  const dec = h("button", { type: "button", class: "qty-btn", "aria-label": `Decrease ${label.toLowerCase()}` }, icon("minus", 16));
  const inc = h("button", { type: "button", class: "qty-btn", "aria-label": `Increase ${label.toLowerCase()}` }, icon("plus", 16));
  const set = (n, silent) => {
    n = Math.max(min, Math.min(max, Math.round(Number(n)) || min));
    v = n; input.value = n;
    dec.disabled = n <= min; inc.disabled = n >= max;
    if (!silent) onChange?.(n);
  };
  dec.onclick = () => set(v - 1);
  inc.onclick = () => set(v + 1);
  input.onchange = () => set(input.value);
  set(v, true);
  return { el: h("div", { class: "qty", role: "group", "aria-label": label }, dec, input, inc), get: () => v, set };
}
