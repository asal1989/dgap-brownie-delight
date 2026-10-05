"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

/** Accessible accordion (button + region) with a smooth height animation. */
export function FAQ({ items }: { items: FaqEntry[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const base = useId();
  return (
    <div className="mx-auto max-w-3xl divide-y divide-beige overflow-hidden rounded-2xl border border-beige bg-white">
      {items.map((f) => {
        const isOpen = open === f.id;
        const panelId = `${base}-${f.id}`;
        return (
          <div key={f.id}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : f.id)}
                className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left font-sans text-base font-semibold tracking-normal text-choc transition hover:bg-cream sm:px-7 sm:text-lg"
              >
                <span>{f.question}</span>
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border border-caramel/40 text-caramel transition-all duration-300", isOpen && "rotate-45 bg-choc text-gold")}>
                  <Plus className="size-4" aria-hidden />
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-label={f.question} data-open={isOpen} inert={!isOpen} className="acc-panel">
              <div>
                <p className="whitespace-pre-line px-5 pb-6 text-ink/75 sm:px-7">{f.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
