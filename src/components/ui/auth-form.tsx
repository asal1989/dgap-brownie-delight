"use client";

import { useActionState } from "react";
import type { FormState } from "@/actions/newsletter";

/** Small accessible form wrapper for server actions that return { ok, message }. */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  className = "",
  hidden,
  submitClass = "btn btn-primary btn-block btn-lg",
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  hidden?: Record<string, string>;
  submitClass?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  return (
    <form action={formAction} className={`space-y-5 ${className}`}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <div role="alert" aria-live="assertive" className="min-h-5 text-sm text-danger">{state && !state.ok ? state.message : null}</div>
      {state?.ok && <p role="status" className="text-sm text-success">{state.message}</p>}
      <button type="submit" disabled={pending} className={submitClass}>{pending ? pendingLabel ?? "Please wait…" : submitLabel}</button>
    </form>
  );
}

export function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  hint,
  defaultValue,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  defaultValue?: string;
  minLength?: number;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input className="input" type={type} name={name} autoComplete={autoComplete} required={required} defaultValue={defaultValue} minLength={minLength} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
