"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CartInput } from "@/lib/quote";

/**
 * Client cart: only what is needed to rebuild a cart (variant ids, quantities, box selections) plus
 * display hints. Prices shown here are hints; the server re-prices everything at quote and checkout time.
 *
 * The cart lives in localStorage and is read through useSyncExternalStore, so it is hydration-safe,
 * stays in sync across tabs and never needs setState inside an effect.
 */
export type CartEntry = {
  key: string;
  type: "product" | "box";
  variantId: string;
  quantity: number;
  selections?: { productId: string; quantity: number }[];
  display: {
    name: string;
    variantLabel: string;
    slug: string;
    image: string | null;
    unitPricePaise: number;
    selectionNames?: string[];
  };
};

type Stored = { items: CartEntry[]; couponCode: string };

const STORAGE_KEY = "dgap-cart-v2";
const MAX_LINE = 50;
const EMPTY: Stored = { items: [], couponCode: "" };

// ───────────── external store ─────────────
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const readRaw = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

function parse(raw: string): Stored {
  if (!raw) return EMPTY;
  try {
    const v = JSON.parse(raw);
    if (v && Array.isArray(v.items)) {
      const items = v.items.filter(
        (i: CartEntry) => i && typeof i.key === "string" && typeof i.variantId === "string" && Number.isInteger(i.quantity) && i.quantity > 0 && i.display,
      );
      return { items, couponCode: typeof v.couponCode === "string" ? v.couponCode : "" };
    }
  } catch {
    /* corrupt storage: start empty */
  }
  return EMPTY;
}

let memoryFallback: string | null = null; // used if localStorage is unavailable (private mode)
function write(next: Stored) {
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
    memoryFallback = null;
  } catch {
    memoryFallback = raw;
  }
  notify();
}
const snapshot = () => memoryFallback ?? readRaw();
const noopSubscribe = () => () => undefined;

// ───────────── context ─────────────
type CartContextValue = {
  /** False until hydration has completed (avoids a server/client mismatch). */
  ready: boolean;
  items: CartEntry[];
  couponCode: string;
  count: number;
  add: (entry: Omit<CartEntry, "key">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  removeMany: (keys: string[]) => void;
  clear: () => void;
  setCouponCode: (code: string) => void;
  toInput: () => CartInput;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function entryKey(variantId: string, selections?: { productId: string; quantity: number }[]) {
  if (!selections?.length) return variantId;
  const sig = [...selections]
    .sort((a, b) => a.productId.localeCompare(b.productId))
    .map((s) => `${s.productId}x${s.quantity}`)
    .join(",");
  return `${variantId}:${sig}`;
}

const current = () => parse(snapshot());

export function CartProvider({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const state = useMemo(() => parse(raw), [raw]);

  const add = useCallback<CartContextValue["add"]>((entry, quantity = 1) => {
    const key = entryKey(entry.variantId, entry.selections);
    const cur = current();
    const found = cur.items.find((i) => i.key === key);
    const items = found
      ? cur.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_LINE, i.quantity + quantity), display: entry.display } : i))
      : [...cur.items, { ...entry, key, quantity: Math.min(MAX_LINE, quantity) }];
    write({ ...cur, items });
  }, []);
  const setQuantity = useCallback((key: string, quantity: number) => {
    const cur = current();
    write({ ...cur, items: quantity <= 0 ? cur.items.filter((i) => i.key !== key) : cur.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_LINE, quantity) } : i)) });
  }, []);
  const remove = useCallback((key: string) => write({ ...current(), items: current().items.filter((i) => i.key !== key) }), []);
  const removeMany = useCallback((keys: string[]) => write({ ...current(), items: current().items.filter((i) => !keys.includes(i.key)) }), []);
  const clear = useCallback(() => write(EMPTY), []);
  const setCouponCode = useCallback((code: string) => write({ ...current(), couponCode: code }), []);

  const value = useMemo<CartContextValue>(
    () => ({
      ready,
      items: state.items,
      couponCode: state.couponCode,
      count: state.items.reduce((n, i) => n + i.quantity, 0),
      add,
      setQuantity,
      remove,
      removeMany,
      clear,
      setCouponCode,
      toInput: () => ({
        items: state.items.map((i) =>
          i.type === "box"
            ? { type: "box" as const, variantId: i.variantId, quantity: i.quantity, selections: i.selections ?? [], ref: i.key }
            : { type: "product" as const, variantId: i.variantId, quantity: i.quantity, ref: i.key },
        ),
        couponCode: state.couponCode || undefined,
      }),
    }),
    [ready, state, add, setQuantity, remove, removeMany, clear, setCouponCode],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
