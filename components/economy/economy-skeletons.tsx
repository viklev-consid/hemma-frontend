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

/** Categorization-rule rows — match badge + pattern, target, switch + actions. */
export function RulesListSkeleton() {
  return (
    <div className="grid gap-2">
      {FOUR_ROWS.map((id) => (
        <div
          key={id}
          className="flex items-center justify-between gap-4 border px-3 py-2.5"
        >
          <div className="grid gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Subscription board cards — name + badge header, cadence line, amount. */
export function SubscriptionBoardSkeleton() {
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

const TWELVE_CELLS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/** Year payment schedule — one name + 12 month cells per subscription row. */
export function PaymentScheduleSkeleton() {
  return (
    <div className="grid gap-2">
      {THREE_ROWS.map((id) => (
        <div key={id} className="flex items-center gap-2">
          <Skeleton className="h-4 w-28 shrink-0" />
          <div className="flex gap-1">
            {TWELVE_CELLS.map((cell) => (
              <Skeleton key={cell} className="size-6" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Month charge calendar — totals header + a stack of day rows. */
export function MonthCalendarSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="grid gap-2">
        {SIX_ROWS.map((id) => (
          <div
            key={id}
            className="flex items-center justify-between gap-4 border px-3 py-2.5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Link-candidate rows — date/note left, amount + link action right. */
export function LinkCandidatesSkeleton() {
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
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Import-preview rows — date/description left, amount + chip right. */
export function ImportPreviewSkeleton() {
  return (
    <div className="grid gap-2">
      {SIX_ROWS.map((id) => (
        <div
          key={id}
          className="flex items-center justify-between gap-4 border px-3 py-2.5"
        >
          <div className="grid gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
