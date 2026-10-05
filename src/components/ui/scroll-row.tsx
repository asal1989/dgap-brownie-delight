"use client";

import { Children, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Swipeable row (CSS scroll-snap). Phones swipe; with `desktop="grid"` it becomes a static grid on large
 * screens, with `desktop="carousel"` it stays a carousel with arrow buttons.
 */
export function ScrollRow({
  children,
  label,
  desktop = "grid",
  gridClass = "lg:grid-cols-4",
  itemClass = "w-[68%] sm:w-[42%]",
  arrows = false,
}: {
  children: ReactNode;
  label: string;
  desktop?: "grid" | "carousel";
  gridClass?: string;
  itemClass?: string;
  arrows?: boolean;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  const grid = desktop === "grid";
  return (
    <div className="relative">
      <ul
        ref={ref}
        role="list"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "no-scrollbar relative -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-5 pb-3 sm:gap-5 lg:mx-0 lg:px-0",
          grid ? cn("lg:grid lg:snap-none lg:overflow-visible lg:pb-0", gridClass) : "",
        )}
      >
        {Children.map(children, (child) => (
          <li className={cn("shrink-0 snap-start", itemClass, grid && "lg:w-auto")}>{child}</li>
        ))}
      </ul>
      {arrows ? (
        <div className={cn("mt-6 flex justify-center gap-3", grid && "lg:hidden")}>
          <button type="button" onClick={() => scrollBy(-1)} aria-label={`Previous ${label}`} className="grid size-12 place-items-center rounded-full border border-choc/25 text-choc transition hover:bg-choc hover:text-cream">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" onClick={() => scrollBy(1)} aria-label={`Next ${label}`} className="grid size-12 place-items-center rounded-full border border-choc/25 text-choc transition hover:bg-choc hover:text-cream">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
