import type { ReactNode } from "react";
import type { FulfillmentStatus, PaymentStatus } from "@/generated/prisma/enums";
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from "@/lib/order-state";

export function AdminHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <h1 className="text-[2.6rem] leading-none">{title}</h1>
        {sub && <p className="mt-2 max-w-3xl text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, hint, testId }: { label: string; value: ReactNode; hint?: string; testId?: string }) {
  return (
    <div className="border border-line bg-white p-5" data-testid={testId}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-[2.1rem] leading-none text-forest">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const TONE: Record<string, string> = {
  green: "border-success/40 bg-success/10 text-success",
  gold: "border-gold bg-gold/15 text-gold-deep",
  red: "border-danger/40 bg-danger/10 text-danger",
  grey: "border-line bg-ivory-deep text-muted",
};

const fulfillmentTone = (s: FulfillmentStatus) =>
  s === "DELIVERED" ? "green" : s === "CANCELLED" ? "red" : s === "PENDING_PAYMENT" ? "grey" : "gold";
const paymentTone = (s: PaymentStatus) =>
  s === "PAID" ? "green" : s === "FAILED" ? "red" : s === "PENDING" ? "grey" : "gold";

export function Pill({ tone = "grey", children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] ${TONE[tone]}`}>{children}</span>;
}

export const FulfillmentPill = ({ status }: { status: FulfillmentStatus }) => <Pill tone={fulfillmentTone(status)}>{FULFILLMENT_LABEL[status]}</Pill>;
export const PaymentPill = ({ status }: { status: PaymentStatus }) => <Pill tone={paymentTone(status)}>{PAYMENT_LABEL[status]}</Pill>;

export function Panel({ title, children, className = "", id }: { title?: string; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`border border-line bg-white p-6 ${className}`} aria-label={title}>
      {title && <h2 className="mb-4 font-serif text-[1.6rem] leading-tight">{title}</h2>}
      {children}
    </section>
  );
}

export const dateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);
