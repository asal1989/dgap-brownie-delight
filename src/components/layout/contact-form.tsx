"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendContactMessage } from "@/actions/contact";
import { cn } from "@/lib/utils";

const input = "w-full rounded-xl border border-line bg-panel px-4 py-3 text-base outline-none focus:border-gold focus:ring-2 focus:ring-caramel/20";

export function ContactForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4 rounded-lg border border-line bg-panel p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          try {
            const res = await sendContactMessage(fd);
            setMsg({ ok: res.ok, text: res.ok ? (res.message ?? "Sent!") : res.error });
            if (res.ok) form.reset();
          } catch {
            setMsg({ ok: false, text: "Network problem. Please try again." });
          }
        });
      }}
    >
      <h2 className="font-display text-2xl text-heading">Send us a message</h2>
      <div>
        <label htmlFor="c-name" className="mb-1 block text-sm font-semibold">Name</label>
        <input id="c-name" name="name" required autoComplete="name" className={input} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-email" className="mb-1 block text-sm font-semibold">Email</label>
          <input id="c-email" name="email" type="email" autoComplete="email" className={input} />
        </div>
        <div>
          <label htmlFor="c-phone" className="mb-1 block text-sm font-semibold">Phone</label>
          <input id="c-phone" name="phone" type="tel" autoComplete="tel" className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="c-msg" className="mb-1 block text-sm font-semibold">Message</label>
        <textarea id="c-msg" name="message" required rows={5} className={input} />
      </div>
      <div className="hidden" aria-hidden>
        <label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {msg ? <p role={msg.ok ? "status" : "alert"} className={cn("text-sm font-semibold", msg.ok ? "text-success" : "text-danger")}>{msg.text}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Sending…" : "Send message"}</Button>
    </form>
  );
}
