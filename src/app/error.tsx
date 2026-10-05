"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl font-semibold text-choc">Something went wrong</h1>
        <p className="mt-4 text-lg text-ink/70">We couldn&apos;t load this page. Please check your connection and try again.</p>
        <Button size="lg" className="mt-8" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
