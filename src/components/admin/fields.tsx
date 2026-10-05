import type { ReactNode } from "react";

export const adminInput =
  "w-full rounded-xl border border-beige bg-white px-3.5 py-2.5 text-sm outline-none focus:border-caramel focus:ring-2 focus:ring-caramel/20";

export function AField({ id, label, hint, children, className }: { id: string; label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-choc">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-ink/70">{hint}</p> : null}
    </div>
  );
}

export function ACheck({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--choc)]" />
      {label}
    </label>
  );
}

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-beige bg-white p-5 sm:p-6 ${className ?? ""}`}>
      {title ? <h2 className="mb-4 font-display text-xl text-choc">{title}</h2> : null}
      {children}
    </section>
  );
}
