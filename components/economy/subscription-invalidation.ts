"use client";

import type { QueryClient } from "@tanstack/react-query";

import {
  listEconomySubscriptionsQueryKey,
  listEconomyTransactionsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";

/**
 * Invalidation after subscription mutations — deliberately **narrow**.
 * Subscriptions never post money, so balances and budget summaries are never
 * invalidated here (the inverse of the recurring-bills rule). Keys that vary
 * by extra params (`year`, `month`, paging) are matched by predicate across
 * all params (mirrors the budget-summary predicate in `transfer-form`).
 */

type GeneratedQueryKeyHead = {
  _id?: string;
  query?: { householdId?: string };
  path?: { subscriptionId?: string };
};

function matchByHousehold(id: string, householdId: string) {
  return (query: { queryKey: readonly unknown[] }) => {
    const key = query.queryKey[0] as GeneratedQueryKeyHead;
    return key?._id === id && key?.query?.householdId === householdId;
  };
}

function matchBySubscription(id: string, subscriptionId: string) {
  return (query: { queryKey: readonly unknown[] }) => {
    const key = query.queryKey[0] as GeneratedQueryKeyHead;
    return key?._id === id && key?.path?.subscriptionId === subscriptionId;
  };
}

/** After create / change-state: list + payment schedule + month calendar. */
export async function invalidateAfterSubscriptionChange(
  queryClient: QueryClient,
  householdId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: listEconomySubscriptionsQueryKey({ query: { householdId } }),
    }),
    queryClient.invalidateQueries({
      predicate: matchByHousehold(
        "getEconomySubscriptionPaymentSchedule",
        householdId,
      ),
    }),
    queryClient.invalidateQueries({
      predicate: matchByHousehold(
        "getEconomySubscriptionMonthCalendar",
        householdId,
      ),
    }),
  ]);
}

/**
 * After link / unlink: that subscription's charge history + link candidates,
 * the month calendar, **and the transactions list** — its rows render
 * `subscriptionId` (linked badge), so they're stale after a link. Still no
 * balances/budget: linking marks an existing transaction, it moves no money.
 */
export async function invalidateAfterLinkChange(
  queryClient: QueryClient,
  householdId: string,
  subscriptionId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      // Paged: match every chargePage/chargePageSize variant.
      predicate: matchBySubscription(
        "getEconomySubscriptionChargeHistory",
        subscriptionId,
      ),
    }),
    queryClient.invalidateQueries({
      predicate: matchBySubscription(
        "getEconomySubscriptionLinkCandidates",
        subscriptionId,
      ),
    }),
    queryClient.invalidateQueries({
      predicate: matchByHousehold(
        "getEconomySubscriptionMonthCalendar",
        householdId,
      ),
    }),
    queryClient.invalidateQueries({
      queryKey: listEconomyTransactionsQueryKey({ query: { householdId } }),
    }),
  ]);
}
