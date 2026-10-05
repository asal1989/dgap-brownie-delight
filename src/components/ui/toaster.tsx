"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { toastStore } from "@/hooks/toast-store";

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function Toaster() {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getServerSnapshot);
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {items.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="animate-fade-up pointer-events-auto flex max-w-sm items-center gap-3 rounded-full bg-espresso py-3 pl-4 pr-3 text-sm font-medium text-cream shadow-lift"
          >
            <Icon className={t.tone === "error" ? "size-5 text-red-300" : "size-5 text-gold"} aria-hidden />
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => toastStore.dismiss(t.id)}
              aria-label="Dismiss notification"
              className="grid size-7 place-items-center rounded-full hover:bg-white/10"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
