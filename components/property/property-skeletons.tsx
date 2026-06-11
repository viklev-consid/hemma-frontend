import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholders for property surfaces. Used inside Suspense fallbacks
 * and while React Query first-paints. Row counts are fixed and keyed by stable
 * strings so they don't trip `no-array-index-as-key`. Mirrors
 * `components/economy/economy-skeletons.tsx`.
 */

const FOUR_ROWS = ["a", "b", "c", "d"] as const;
const THREE_ROWS = ["a", "b", "c"] as const;

/** A stack of full-width rows — for plain lists. */
export function PropertyListSkeleton() {
  return (
    <div className="grid gap-2">
      {FOUR_ROWS.map((id) => (
        <Skeleton key={id} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** Project list cards — name + status header, meta line, dates/budget row. */
export function ProjectListSkeleton() {
  return (
    <div className="grid gap-3">
      {THREE_ROWS.map((id) => (
        <div key={id} className="grid gap-3 border p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** A title + body block — for detail headers and summary panels. */
export function PropertyCardSkeleton() {
  return (
    <div className="grid gap-3 border p-4">
      <Skeleton className="h-5 w-40" />
      {THREE_ROWS.map((id) => (
        <Skeleton key={id} className="h-4 w-full" />
      ))}
    </div>
  );
}
