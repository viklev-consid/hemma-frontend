import { describe, expect, it } from "vitest";

import type { RecurringBillResponse } from "@/api/generated";
import {
  OCCURRENCE_STATE,
  RECURRING_BILL_DIRECTION,
  RECURRING_BILL_TYPE,
  confirmableOccurrences,
} from "./recurring-bill";

function bill(
  overrides: Partial<RecurringBillResponse>,
): RecurringBillResponse {
  return {
    recurringBillId: "bill-1",
    householdId: "hh-1",
    name: "Electricity",
    accountId: "acc-1",
    categoryId: null,
    amount: { amount: "1200.00", currency: "SEK" },
    type: RECURRING_BILL_TYPE.Estimated,
    direction: RECURRING_BILL_DIRECTION.Expense,
    cadenceFrequency: "Monthly",
    cadenceInterval: 1,
    cadenceDayOfMonth: 25,
    startsOn: "2026-01-25",
    nextDueOn: "2026-06-25",
    note: null,
    pendingOccurrences: [],
    ...overrides,
  };
}

describe("confirmableOccurrences", () => {
  it("flattens estimated bills' occurrences with a non-null transactionId", () => {
    const bills = [
      bill({
        recurringBillId: "bill-1",
        name: "Electricity",
        pendingOccurrences: [
          {
            dueOn: "2026-06-25",
            state: OCCURRENCE_STATE.Posted,
            transactionId: "tx-1",
          },
          {
            dueOn: "2026-07-25",
            state: OCCURRENCE_STATE.Pending,
            transactionId: null,
          },
        ],
      }),
    ];

    const result = confirmableOccurrences(bills);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      recurringBillId: "bill-1",
      billName: "Electricity",
      transactionId: "tx-1",
      dueOn: "2026-06-25",
    });
    expect(result[0].amount).toEqual({ amount: "1200.00", currency: "SEK" });
  });

  it("ignores fixed bills entirely", () => {
    const bills = [
      bill({
        type: RECURRING_BILL_TYPE.Fixed,
        pendingOccurrences: [
          {
            dueOn: "2026-06-25",
            state: OCCURRENCE_STATE.Posted,
            transactionId: "tx-1",
          },
        ],
      }),
    ];
    expect(confirmableOccurrences(bills)).toEqual([]);
  });

  it("ignores estimated occurrences without a posted transaction", () => {
    const bills = [
      bill({
        pendingOccurrences: [
          {
            dueOn: "2026-06-25",
            state: OCCURRENCE_STATE.Pending,
            transactionId: null,
          },
        ],
      }),
    ];
    expect(confirmableOccurrences(bills)).toEqual([]);
  });

  it("returns an empty list when there are no bills", () => {
    expect(confirmableOccurrences([])).toEqual([]);
  });
});
