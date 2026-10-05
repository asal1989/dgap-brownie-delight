"use client";

import { useState } from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CouponField({ applied, message, onApply }: { applied: string | null; message: string | null; onApply: (code: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div>
      <label htmlFor="coupon" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-heading">
        <Tag className="size-4" aria-hidden /> Coupon code
      </label>
      {applied ? (
        <div className="flex items-center justify-between rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          <span>{applied} applied</span>
          <button type="button" className="underline" onClick={() => onApply("")}>Remove</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            id="coupon"
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            maxLength={40}
            autoCapitalize="characters"
            className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-panel px-4 text-sm uppercase outline-none focus:border-gold"
            placeholder="Enter code"
          />
          <Button variant="outline" onClick={() => value.trim() && onApply(value.trim())}>Apply</Button>
        </div>
      )}
      {message && !applied ? <p className="mt-2 text-sm text-danger" role="alert">{message}</p> : null}
    </div>
  );
}
