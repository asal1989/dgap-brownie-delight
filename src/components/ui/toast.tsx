"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "error"; href?: string; hrefLabel?: string };
type ShowOptions = { tone?: "success" | "error"; href?: string; hrefLabel?: string };

const ToastContext = createContext<{ show: (message: string, opts?: ShowOptions) => void } | null>(null);

/** Like useToast, but returns null outside a <ToastProvider> (used by shared form components). */
export function useOptionalToast() {
  return useContext(ToastContext);
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** Elegant, non-blocking feedback. The container is a polite live region so screen readers hear every toast. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const reduce = useReducedMotion();

  const show = useCallback((message: string, opts: ShowOptions = {}) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-2), { id, message, tone: opts.tone ?? "success", href: opts.href, hrefLabel: opts.hrefLabel }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[400] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 border-l-[3px] border-gold bg-forest px-4 py-3 text-sm text-ivory shadow-xl"
            >
              {t.tone === "success" ? <Check size={18} className="shrink-0 text-gold" aria-hidden /> : <CircleAlert size={18} className="shrink-0 text-gold" aria-hidden />}
              <span className="flex-1">{t.message}</span>
              {t.href && (
                <Link href={t.href} className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-gold underline-offset-4 hover:underline">
                  {t.hrefLabel ?? "View"}
                </Link>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
