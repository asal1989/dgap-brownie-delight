export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const EMPTY: ToastItem[] = [];
let toasts: ToastItem[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const toastStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => toasts,
  getServerSnapshot: () => EMPTY,
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
};

export function toast(message: string, tone: ToastTone = "success") {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, message, tone }];
  emit();
  setTimeout(() => toastStore.dismiss(id), 3200);
}
