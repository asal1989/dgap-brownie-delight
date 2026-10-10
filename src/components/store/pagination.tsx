import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="grid size-11 place-items-center border border-line bg-white hover:border-forest" aria-label="Previous page"><ChevronLeft size={18} aria-hidden /></Link>
      ) : null}
      {nums.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && nums[i - 1] !== n - 1 && <span className="px-1 text-muted" aria-hidden>…</span>}
          <Link href={hrefFor(n)} aria-current={n === page ? "page" : undefined} className={`grid size-11 place-items-center border text-sm ${n === page ? "border-forest bg-forest text-ivory" : "border-line bg-white hover:border-forest"}`}>{n}</Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className="grid size-11 place-items-center border border-line bg-white hover:border-forest" aria-label="Next page"><ChevronRight size={18} aria-hidden /></Link>
      ) : null}
    </nav>
  );
}
