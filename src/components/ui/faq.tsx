import { ChevronDown } from "lucide-react";

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

/** Native <details> accordion: fully keyboard/screen-reader accessible with zero client JS. */
export function FAQ({ items }: { items: FaqEntry[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-beige rounded-3xl border border-beige bg-white">
      {items.map((f) => (
        <details key={f.id} className="group px-5 sm:px-7">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-semibold text-choc marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="text-base sm:text-lg">{f.question}</span>
            <ChevronDown className="size-5 shrink-0 text-caramel transition-transform duration-300 group-open:rotate-180" aria-hidden />
          </summary>
          <p className="whitespace-pre-line pb-5 text-ink/75">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
