import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholders for economy surfaces. Used inside Suspense fallbacks
 * and while React Query first-paints. Row counts are fixed and keyed by stable
 * strings so they don't trip `no-array-index-as-key`.
 */

const FOUR_ROWS = ["a", "b", "c", "d"] as const;
const THREE_ROWS = ["a", "b", "c"] as const;

/** A stack of full-width rows — for account/category lists. */
export function EconomyListSkeleton() {
  return (
    <div className="grid gap-2">
      {FOUR_ROWS.map((id) => (
        <Skeleton key={id} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** A title + body block — for cards and summary panels. */
export function EconomyCardSkeleton() {
  return (
    <div className="grid gap-3 border p-4">
      <Skeleton className="h-5 w-40" />
      {THREE_ROWS.map((id) => (
        <Skeleton key={id} className="h-4 w-full" />
      ))}
    </div>
  );
}

/** Editable budget lines — label + amount field per row. */
export function EconomyBudgetSkeleton() {
  return (
    <div className="grid gap-2">
      {FOUR_ROWS.map((id) => (
        <div key={id} className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  );
}
