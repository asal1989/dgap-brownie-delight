"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  if (!current) {
    return <div className="grid aspect-[4/5] place-items-center bg-ivory-deep text-muted">No photo yet</div>;
  }
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
        <Image key={current.url} src={current.url} alt={current.alt || name} fill priority sizes="(min-width: 1024px) 45vw, 92vw" className="object-cover" />
        <span className="pointer-events-none absolute inset-3 border border-gold/50" aria-hidden />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-3" aria-label="Product photos">
          {images.map((im, i) => (
            <li key={im.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-pressed={i === index}
                className={`relative block size-20 overflow-hidden border transition-opacity ${i === index ? "border-forest opacity-100" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <Image src={im.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
