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

const SIX_ROWS = ["a", "b", "c", "d", "e", "f"] as const;

/** Mobile-first transaction rows — left: category/date, right: amount. */
export function TransactionListSkeleton() {
  return (
    <div className="grid gap-2">
      {SIX_ROWS.map((id) => (
        <div
          key={id}
          className="flex items-center justify-between gap-4 border px-3 py-2.5"
        >
          <div className="grid gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Recurring-bill cards — header (name + badges) + cadence/amount + a row. */
export function RecurringBillListSkeleton() {
  return (
    <div className="grid gap-3">
      {THREE_ROWS.map((id) => (
        <div key={id} className="grid gap-3 border p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Confirmation-inbox rows — left: bill/due, right: amount + confirm action. */
export function RecurringInboxSkeleton() {
  return (
    <div className="grid gap-2">
      {THREE_ROWS.map((id) => (
        <div
          key={id}
          className="flex items-center justify-between gap-4 border px-3 py-2.5"
        >
          <div className="grid gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
