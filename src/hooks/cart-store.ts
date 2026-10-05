import type { CartLine } from "@/types";

// A tiny external store: cart lines persist in localStorage and sync across tabs.
// Prices stored here are for display only; the server re-prices everything at checkout.

const STORAGE_KEY = "dgap-cart-v1";
const MAX_QTY = 20;

export interface CartState {
  lines: CartLine[];
  open: boolean;
  hydrated: boolean;
}

const SERVER_STATE: CartState = { lines: [], open: false, hydrated: false };
let state: CartState = SERVER_STATE;
let initialised = false;
const listeners = new Set<() => void>();

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as CartLine).productId === "string" &&
        typeof (l as CartLine).price === "number" &&
        typeof (l as CartLine).quantity === "number",
    );
  } catch {
    return [];
  }
}

function persist(lines: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable (private mode): cart still works for this session */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function set(next: Partial<CartState>, save = false) {
  state = { ...state, ...next };
  if (save) persist(state.lines);
  emit();
}

function init() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  state = { lines: readStorage(), open: false, hydrated: true };
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) set({ lines: readStorage() });
  });
}

export const cartStore = {
  subscribe(listener: () => void) {
    init();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): CartState => {
    init();
    return state;
  },
  getServerSnapshot: (): CartState => SERVER_STATE,

  add(line: Omit<CartLine, "quantity">, quantity = 1) {
    const existing = state.lines.find((l) => l.productId === line.productId);
    const lines = existing
      ? state.lines.map((l) =>
          l.productId === line.productId ? { ...l, ...line, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l,
        )
      : [...state.lines, { ...line, quantity: Math.min(MAX_QTY, quantity) }];
    set({ lines }, true);
  },
  setQuantity(productId: string, quantity: number) {
    const lines =
      quantity <= 0
        ? state.lines.filter((l) => l.productId !== productId)
        : state.lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l));
    set({ lines }, true);
  },
  remove(productId: string) {
    set({ lines: state.lines.filter((l) => l.productId !== productId) }, true);
  },
  clear() {
    set({ lines: [] }, true);
  },
  open() {
    set({ open: true });
  },
  close() {
    set({ open: false });
  },
};

export function cartTotals(lines: CartLine[]) {
  return {
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.price * l.quantity, 0),
  };
}
