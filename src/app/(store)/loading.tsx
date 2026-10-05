import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="container-page py-12" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
