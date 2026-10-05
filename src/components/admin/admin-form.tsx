"use client";

import { useActionState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/types";

type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult | null>;

/** Wraps a server action with pending state and inline success/error feedback. */
export function AdminForm({ action, children, submitLabel = "Save", className }: { action: FormAction; children: ReactNode; submitLabel?: string; className?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={cn("space-y-5", className)}>
      {children}
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={cn("rounded-xl px-4 py-3 text-sm font-semibold", state.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
          {state.ok ? (state.message ?? "Saved.") : state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-choc px-6 text-sm font-semibold text-cream transition hover:bg-espresso disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
