import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle, EmptyRow, TableWrap, td, th } from "@/components/admin/bits";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteReview, setReviewApproval } from "@/actions/admin";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviews() {
  const reviews = await prisma.review.findMany({ include: { product: { select: { name: true } } }, orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }], take: 200 });
  const btn = "rounded-full border border-beige px-3 py-1.5 text-xs font-semibold hover:bg-beige/60";
  return (
    <>
      <AdminTitle title="Reviews" />
      <p className="mb-4 text-sm text-ink/70">Customer reviews appear on the site only after you approve them.</p>
      <TableWrap>
        <thead><tr><th className={th}>Customer</th><th className={th}>Product</th><th className={th}>Rating</th><th className={th}>Review</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {reviews.length === 0 ? <EmptyRow cols={6} text="No reviews yet." /> : null}
          {reviews.map((r) => (
            <tr key={r.id}>
              <td className={`${td} font-semibold`}>{r.customerName}</td>
              <td className={td}>{r.product.name}</td>
              <td className={td}>{"★".repeat(r.rating)}</td>
              <td className={`${td} max-w-xs`}>{r.review}</td>
              <td className={td}>{r.isApproved ? <span className="text-success">Approved</span> : <span className="text-amber-700">Awaiting</span>}</td>
              <td className={`${td} whitespace-nowrap text-right`}>
                <form action={setReviewApproval} className="inline"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="approve" value={r.isApproved ? "0" : "1"} /><button className={btn}>{r.isApproved ? "Unpublish" : "Approve"}</button></form>{" "}
                <form action={deleteReview} className="inline"><input type="hidden" name="id" value={r.id} /><ConfirmButton message="Delete this review?" className={`${btn} text-danger`}>Delete</ConfirmButton></form>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
