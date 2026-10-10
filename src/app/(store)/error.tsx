"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-narrow py-28 text-center">
      <p className="eyebrow mb-4">Something went wrong</p>
      <h1 className="text-5xl">We hit a snag</h1>
      <span className="rule-gold mx-auto my-6" aria-hidden />
      <p className="text-muted">Please try again. If the problem continues, message us and we will help you order.</p>
      {error.digest && <p className="mt-3 text-xs text-muted">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-outline">Back to home</Link>
      </div>
    </div>
  );
}
