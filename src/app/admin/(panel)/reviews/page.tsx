import { AdminHeader, Panel, Pill, dateTime } from "@/components/admin/admin-ui";
import { ReviewActions } from "@/components/admin/misc-forms";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  await requirePermission("reviews:moderate");
  const reviews = await db.review.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100, include: { product: { select: { name: true } } } });
  return (
    <>
      <AdminHeader title="Reviews" sub="Reviews come only from customers with a delivered order. Nothing is shown publicly until you approve it." />
      {reviews.length === 0 ? <Panel><p className="text-sm text-muted">No reviews have been submitted yet.</p></Panel> : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Panel key={r.id}>
              <div className="flex flex-wrap items-center gap-3"><p className="text-gold-deep" role="img" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p><Pill tone={r.status === "APPROVED" ? "green" : r.status === "REJECTED" ? "red" : "gold"}>{r.status}</Pill>{r.verifiedPurchase && <Pill tone="grey">Verified purchase</Pill>}<span className="text-xs text-muted">{r.product.name} · {r.authorName} · {dateTime(r.createdAt)}</span></div>
              {r.title && <h3 className="mt-2 font-serif text-xl">{r.title}</h3>}
              <p className="mt-1 text-sm text-muted">{r.body}</p>
              <div className="mt-4"><ReviewActions id={r.id} status={r.status} /></div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
