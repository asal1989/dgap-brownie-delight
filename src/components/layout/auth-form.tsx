"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { loginAction, registerAction } from "@/actions/auth";

const input = "h-12 w-full rounded-xl border border-beige bg-white px-4 text-base outline-none focus:border-caramel focus:ring-2 focus:ring-caramel/20";

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-beige bg-white p-6 sm:p-8">
      <div role="tablist" aria-label="Account" className="mb-6 grid grid-cols-2 rounded-full bg-beige/60 p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`min-h-11 rounded-full text-sm font-semibold transition ${mode === m ? "bg-choc text-cream" : "text-choc"}`}
          >
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("next", next);
          start(async () => {
            const res = await (mode === "login" ? loginAction(fd) : registerAction(fd));
            // On success the action redirects; we only get here with an error.
            if (res && !res.ok) setError(res.error);
          });
        }}
      >
        {mode === "register" ? (
          <div>
            <label htmlFor="a-name" className="mb-1 block text-sm font-semibold">Name</label>
            <input id="a-name" name="name" required autoComplete="name" className={input} />
          </div>
        ) : null}
        <div>
          <label htmlFor="a-email" className="mb-1 block text-sm font-semibold">Email</label>
          <input id="a-email" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <div>
          <label htmlFor="a-pass" className="mb-1 block text-sm font-semibold">Password</label>
          <input id="a-pass" name="password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} className={input} />
        </div>
        {error ? <p className="text-sm font-semibold text-danger" role="alert">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
        <p className="text-center text-xs text-ink/55">You can also check out as a guest, no account needed.</p>
      </form>
    </div>
  );
}
