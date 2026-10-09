import { PRODUCTS } from "./products.js";
import { BOX_SIZES } from "./config.js";

const KEY = "dgap-cart-v1";
const listeners = new Set();
let items = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(valid) : [];
  } catch {
    return [];
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  listeners.forEach((fn) => fn(items));
}
/** Drop entries whose product/size no longer exists in the catalogue. */
function valid(i) {
  if (i.kind === "box") return BOX_SIZES.some((s) => s.id === i.sizeId) && i.picks?.every((p) => PRODUCTS.some((x) => x.id === p.productId));
  const p = PRODUCTS.find((x) => x.id === i.productId);
  return !!p && p.sizes.some((s) => s.id === i.sizeId);
}

export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const getItems = () => items;
export const cartCount = () => items.reduce((n, i) => n + i.qty, 0);

export function addProduct(productId, sizeId, qty = 1) {
  const key = `p:${productId}:${sizeId}`;
  const found = items.find((i) => i.key === key);
  if (found) found.qty = Math.min(99, found.qty + qty);
  else items.push({ key, kind: "product", productId, sizeId, qty });
  save();
}

export function addBox(sizeId, picks) {
  const key = `b:${sizeId}:${picks.map((p) => p.productId + "x" + p.qty).join(",")}`;
  const found = items.find((i) => i.key === key);
  if (found) found.qty = Math.min(99, found.qty + 1);
  else items.push({ key, kind: "box", sizeId, picks, qty: 1 });
  save();
}

export function setQty(key, qty) {
  const it = items.find((i) => i.key === key);
  if (!it) return;
  if (qty <= 0) items = items.filter((i) => i.key !== key);
  else it.qty = Math.min(99, qty);
  save();
}
export function clearCart() { items = []; save(); }

/** Resolve stored items into display/order lines. */
export function cartLines() {
  return items.map((i) => {
    if (i.kind === "box") {
      const size = BOX_SIZES.find((s) => s.id === i.sizeId);
      return {
        key: i.key, qty: i.qty, name: "Custom Brownie Box", size: `${size.label} (${size.count} brownies)`, unit: size.price,
        extras: i.picks.map((p) => `${p.qty} × ${PRODUCTS.find((x) => x.id === p.productId).name}`),
        image: "images/gift-box-sm.jpg",
      };
    }
    const p = PRODUCTS.find((x) => x.id === i.productId);
    const s = p.sizes.find((x) => x.id === i.sizeId);
    return { key: i.key, qty: i.qty, name: p.name, size: s.label, unit: s.price, image: p.images[0].thumb, available: p.available };
  });
}
