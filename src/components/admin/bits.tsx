import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABEL, STATUS_TONE, type OrderStatusValue } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

export function AdminTitle({ title, action, saved }: { title: string; action?: ReactNode; saved?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-3xl text-choc">{title}</h1>
      {action}
      {saved ? <p role="status" className="w-full rounded-xl bg-success/10 px-4 py-2 text-sm font-semibold text-success">Saved successfully.</p> : null}
    </div>
  );
}

export function AdminLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "ghost" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition",
        variant === "primary" ? "bg-choc text-cream hover:bg-espresso" : "border border-beige bg-white text-choc hover:bg-beige/50",
      )}
    >
      {children}
    </Link>
  );
}

export function StatusPill({ status }: { status: OrderStatusValue }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>;
}

export function DashboardCard({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-beige bg-white p-5">
      <div className="flex items-center justify-between text-sm text-ink/60">
        <span>{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-choc">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink/50">{hint}</p> : null}
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-beige bg-white">
      <table className="w-full min-w-[40rem] text-left text-sm">{children}</table>
    </div>
  );
}
export const th = "whitespace-nowrap bg-cream px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink/60";
export const td = "border-t border-beige px-4 py-3 align-middle";

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center text-ink/55">{text}</td>
    </tr>
  );
}
