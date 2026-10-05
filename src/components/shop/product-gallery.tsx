"use client";

import { useState } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const list = images.length ? images : [""];
  const [active, setActive] = useState(0);
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-beige">
        <SmartImage src={list[active] || null} alt={`${name}${list.length > 1 ? `, photo ${active + 1} of ${list.length}` : ""}`} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      </div>
      {list.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Product photos">
          {list.map((src, i) => (
            <li key={src + i}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={cn("relative block size-20 overflow-hidden rounded-2xl border-2 bg-beige transition", i === active ? "border-choc" : "border-transparent opacity-70 hover:opacity-100")}
              >
                <SmartImage src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
