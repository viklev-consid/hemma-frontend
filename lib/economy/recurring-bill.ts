import type {
  RecurringBillDirection,
  RecurringBillOccurrenceResponse,
  RecurringBillOccurrenceState,
  RecurringBillResponse,
  RecurringBillType,
} from "@/api/generated";

/**
 * Recurring-bill enum catalogs. PascalCase to match the backend enums exactly;
 * `as const satisfies Record<...>` makes a backend rename surface as a
 * TypeScript error at every call site instead of a silently broken guard.
 * Mirrors the `TRANSFER_MODE` pattern in `lib/economy/transfer.ts`.
 */
export const RECURRING_BILL_TYPE = {
  Fixed: "Fixed",
  Estimated: "Estimated",
} as const satisfies Record<RecurringBillType, RecurringBillType>;

export const RECURRING_BILL_DIRECTION = {
  Expense: "Expense",
  Income: "Income",
} as const satisfies Record<RecurringBillDirection, RecurringBillDirection>;

export const OCCURRENCE_STATE = {
  Pending: "Pending",
  Posted: "Posted",
  Confirmed: "Confirmed",
  Skipped: "Skipped",
  Paused: "Paused",
} as const satisfies Record<
  RecurringBillOccurrenceState,
  RecurringBillOccurrenceState
>;

/**
 * A confirmable occurrence flattened out of the bills list — carries enough
 * context (bill id + name) to render an inbox row and submit a confirm without
 * a second lookup.
 */
export type ConfirmableOccurrence = {
  recurringBillId: string;
  billName: string;
  /** Non-null: the posted transaction the confirm targets. */
  transactionId: string;
  dueOn: string;
  /** The estimate's posted amount, used as the confirm input's default. */
  amount: RecurringBillResponse["amount"];
  occurrence: RecurringBillOccurrenceResponse;
};

/**
 * The confirmation-inbox source, derived client-side from the same
 * `listEconomyRecurringBills` response (there is no separate occurrence
 * endpoint). The confirmable set = pending occurrences on `Estimated` bills
 * that have a non-null `transactionId` (you can't confirm an occurrence with no
 * posted transaction yet). Gating on `transactionId != null` is the robust
 * check — see open-Q #3 in the Phase 3 plan.
 */
export function confirmableOccurrences(
  bills: RecurringBillResponse[],
): ConfirmableOccurrence[] {
  return bills.flatMap((bill) =>
    bill.type === RECURRING_BILL_TYPE.Estimated
      ? bill.pendingOccurrences
          .filter(
            (
              occ,
            ): occ is RecurringBillOccurrenceResponse & {
              transactionId: string;
            } => occ.transactionId !== null,
          )
          .map((occ) => ({
            recurringBillId: bill.recurringBillId,
            billName: bill.name,
            transactionId: occ.transactionId,
            dueOn: occ.dueOn,
            amount: bill.amount,
            occurrence: occ,
          }))
      : [],
  );
}
