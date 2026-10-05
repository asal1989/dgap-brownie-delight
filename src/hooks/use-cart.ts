"use client";

import { useMemo, useSyncExternalStore } from "react";
import { cartStore, cartTotals } from "./cart-store";

export function useCart() {
  const state = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const totals = useMemo(() => cartTotals(state.lines), [state.lines]);
  return { ...state, ...totals, actions: cartStore };
}
