import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle } from "@/components/admin/bits";
import { markMessageRead } from "@/actions/admin";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessages() {
  const messages = await prisma.contactMessage.findMany({ orderBy: [{ isRead: "asc" }, { createdAt: "desc" }], take: 100 });
  return (
    <>
      <AdminTitle title="Messages" />
      {messages.length === 0 ? <p className="rounded-2xl border border-beige bg-white p-10 text-center text-ink/70">No messages yet.</p> : null}
      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className={`rounded-2xl border bg-white p-5 ${m.isRead ? "border-beige" : "border-caramel"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-choc">{m.name} {!m.isRead ? <span className="ml-2 rounded-full bg-caramel px-2 py-0.5 text-xs text-white">New</span> : null}</p>
              <p className="text-xs text-ink/70">{m.createdAt.toLocaleString("en-IN")}</p>
            </div>
            <p className="mt-1 text-sm text-ink/70">{[m.email, m.phone].filter(Boolean).join(" · ")}</p>
            <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
            {!m.isRead ? <form action={markMessageRead} className="mt-3"><input type="hidden" name="id" value={m.id} /><button className="rounded-full border border-beige px-4 py-1.5 text-xs font-semibold hover:bg-beige/60">Mark as read</button></form> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
