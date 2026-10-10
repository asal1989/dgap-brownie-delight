"use client";

import { useActionState } from "react";
import { subscribeNewsletter, type FormState } from "@/actions/newsletter";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, null);
  return (
    <form action={action} className="mx-auto mt-8 max-w-xl text-left" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="field flex-1">
          <span className="sr-only">Email address</span>
          <input type="email" name="email" required autoComplete="email" placeholder="Your email address" className="input !min-h-[52px]" aria-describedby="nl-consent nl-status" />
        </label>
        <button type="submit" disabled={pending} className="btn btn-gold btn-lg">{pending ? "Joining…" : "Subscribe"}</button>
      </div>
      {/* Honeypot, hidden from people and assistive tech */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label id="nl-consent" className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ivory/80">
        <input type="checkbox" name="consent" className="mt-1 size-4 accent-gold" required />
        <span>I agree to receive occasional emails from DGAP Brownie Delight and understand I can unsubscribe at any time.</span>
      </label>
      <p id="nl-status" role="status" aria-live="polite" className={`mt-3 min-h-6 text-sm ${state?.ok ? "text-gold" : "text-[#ffb4a8]"}`}>{state?.message}</p>
    </form>
  );
}
