import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle, EmptyRow, TableWrap, td, th } from "@/components/admin/bits";
import { AdminForm } from "@/components/admin/admin-form";
import { ACheck, AField, Panel, adminInput } from "@/components/admin/fields";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteFaq, saveFaq } from "@/actions/admin";

export const metadata: Metadata = { title: "FAQs" };

export default async function AdminFaqs({ searchParams }: { searchParams: Promise<{ saved?: string; edit?: string }> }) {
  const { saved, edit } = await searchParams;
  const faqs = await prisma.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { question: "asc" }] });
  const f = edit ? faqs.find((x) => x.id === edit) : undefined;
  const k = f?.id ?? "new";
  return (
    <>
      <AdminTitle title="FAQs" saved={!!saved} />
      <p className="mb-4 text-sm text-ink/60">Only <strong>active</strong> questions appear on the site. Write answers that match your real policies, then switch them on.</p>
      <div className="grid gap-8 xl:grid-cols-[1fr_26rem]">
        <TableWrap>
          <thead><tr><th className={th}>Question</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {faqs.length === 0 ? <EmptyRow cols={3} text="No FAQs yet." /> : null}
            {faqs.map((x) => (
              <tr key={x.id}>
                <td className={td}><span className="font-semibold text-choc">{x.question}</span><p className="line-clamp-1 text-xs text-ink/50">{x.answer}</p></td>
                <td className={td}>{x.isActive ? <span className="text-success">Live</span> : <span className="text-ink/50">Hidden</span>}</td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <a href={`/admin/faqs?edit=${x.id}`} className="rounded-full border border-beige px-3 py-1.5 text-xs font-semibold hover:bg-beige/60">Edit</a>{" "}
                  <form action={deleteFaq} className="inline"><input type="hidden" name="id" value={x.id} /><ConfirmButton message="Delete this FAQ?" className="rounded-full border border-beige px-3 py-1.5 text-xs font-semibold text-danger hover:bg-beige/60">Delete</ConfirmButton></form>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Panel title={f ? "Edit FAQ" : "Add FAQ"}>
          <AdminForm key={k} action={saveFaq} submitLabel={f ? "Save FAQ" : "Add FAQ"}>
            {f ? <input type="hidden" name="id" value={f.id} /> : null}
            <AField id={`q-${k}`} label="Question"><input id={`q-${k}`} name="question" required defaultValue={f?.question} className={adminInput} /></AField>
            <AField id={`a-${k}`} label="Answer"><textarea id={`a-${k}`} name="answer" required rows={5} defaultValue={f?.answer} className={adminInput} /></AField>
            <AField id={`s-${k}`} label="Sort order"><input id={`s-${k}`} name="sortOrder" type="number" min={0} defaultValue={f?.sortOrder ?? 0} className={adminInput} /></AField>
            <ACheck name="isActive" label="Show on website" defaultChecked={f?.isActive} />
          </AdminForm>
          {f ? <a href="/admin/faqs" className="mt-3 inline-block text-sm text-caramel underline">Cancel editing</a> : null}
        </Panel>
      </div>
    </>
  );
}
