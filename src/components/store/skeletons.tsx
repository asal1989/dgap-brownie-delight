/** Quiet placeholder tiles shown while a catalogue query streams in. */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="container-x py-14" role="status" aria-live="polite" aria-label="Loading brownies">
      <ul className="grid gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="animate-pulse">
            <div className="aspect-[4/5] bg-ivory-deep" />
            <div className="mx-auto mt-5 h-5 w-2/3 bg-ivory-deep" />
            <div className="mx-auto mt-3 h-3 w-1/2 bg-ivory-deep" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading brownies…</span>
    </div>
  );
}
