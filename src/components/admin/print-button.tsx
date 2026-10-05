"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print inline-flex min-h-10 items-center gap-2 rounded-full border border-beige bg-white px-5 text-sm font-semibold text-choc hover:bg-beige/50">
      <Printer className="size-4" aria-hidden /> Print order
    </button>
  );
}
