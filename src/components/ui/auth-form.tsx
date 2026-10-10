"use client";

import { useActionState, useCallback, useEffect, useRef, useTransition } from "react";
import type { FormState } from "@/actions/newsletter";
import { useOptionalToast } from "@/components/ui/toast";

/** Small accessible form wrapper for server actions that return { ok, message }. */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  className = "",
  hidden,
  submitClass = "btn btn-primary btn-block btn-lg",
  resetOnSuccess = false,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  hidden?: Record<string, string>;
  submitClass?: string;
  resetOnSuccess?: boolean;
}) {
  const toast = useOptionalToast();
  // Announce success as soon as the server answers. The page often re-renders without this form
  // straight afterwards (e.g. a cancelled order no longer shows the cancel form), so an effect would be too late.
  const wrapped = useCallback(
    async (prev: FormState, data: FormData) => {
      const result = await action(prev, data);
      if (result?.ok) toast?.show(result.message);
      return result;
    },
    [action, toast],
  );
  const [state, formAction, pending] = useActionState<FormState, FormData>(wrapped, null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  // React 19 clears every uncontrolled field after a form action, even a failed one. Submitting through
  // onSubmit keeps what the user typed when validation fails; we only clear the form after a success.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} onSubmit={onSubmit} className={`space-y-5 ${className}`}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <div role="alert" aria-live="assertive" className="min-h-5 text-sm text-danger">{state && !state.ok ? state.message : null}</div>
      {state?.ok && !toast && <p role="status" className="text-sm text-success">{state.message}</p>}
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
