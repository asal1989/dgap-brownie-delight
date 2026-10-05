"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { formatINR } from "@/lib/utils";

interface Result {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  category: string;
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
        setStatus("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, open]);

  if (!open) return null;
  const q = query.trim();
  const showResults = q.length >= 2;

  return (
    <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label="Search brownies">
      <div className="absolute inset-0 bg-espresso/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="animate-fade-up relative mx-auto mt-0 max-h-[100dvh] overflow-y-auto bg-cream shadow-2xl sm:mt-16 sm:max-w-2xl sm:rounded-3xl">
        <form
          role="search"
          className="flex items-center gap-2 border-b border-beige px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (q) {
              onClose();
              router.push(`/shop?q=${encodeURIComponent(q)}`);
            }
          }}
        >
          <Search className="size-5 shrink-0 text-caramel" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brownies, flavours, gift boxes…"
            aria-label="Search products"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/40"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="grid size-11 place-items-center rounded-full hover:bg-beige/70">
            <X className="size-5" aria-hidden />
          </button>
        </form>
        <div className="min-h-32 p-4" aria-live="polite">
          {!showResults ? (
            <p className="py-8 text-center text-sm text-ink/70">Type at least 2 letters to search.</p>
          ) : status === "error" ? (
            <p className="py-8 text-center text-sm text-danger">Search is unavailable right now. Please try again.</p>
          ) : status === "loading" && results.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/70">Searching…</p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/70">No brownies match &ldquo;{q}&rdquo;. Try another word.</p>
          ) : (
            <ul className="space-y-1">
              {results.map((r) => (
                <li key={r.slug}>
                  <Link href={`/shop/${r.slug}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-beige/50">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-beige">
                      <SmartImage src={r.image} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-choc">{r.name}</span>
                      <span className="text-xs text-ink/70">{r.category}</span>
                    </span>
                    <span className="font-bold text-choc">{formatINR(r.price)}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`/shop?q=${encodeURIComponent(q)}`} onClick={onClose} className="mt-2 block rounded-2xl bg-choc py-3 text-center text-sm font-semibold text-cream">
                  See all results
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
