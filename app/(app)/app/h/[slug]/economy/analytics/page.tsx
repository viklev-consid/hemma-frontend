import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import {
  getEconomyCategoryTrendOptions,
  getEconomyIncomeVsExpenseOptions,
  getEconomyPeriodComparisonOptions,
  getEconomySpendBreakdownOptions,
  getEconomyTopTransactionsOptions,
  getEconomyVarianceHistoryOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { AnalyticsPage } from "@/components/economy/analytics-page";
import { todayAnchorDate } from "@/lib/economy/anchor-date";
import {
  DEFAULT_TOP_LIMIT,
  defaultAnalyticsRange,
} from "@/lib/economy/analytics";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("analytics") };
}

export default async function EconomyAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();
  const householdId = await resolveHouseholdId(slug);

  if (householdId) {
    // Prefetch all six surfaces for the DEFAULT range/anchor (ADR 0009). Range
    // changes refetch client-side. Each prefetch is independently swallowed so
    // one failing surface never blanks the page — the client query re-runs and
    // renders that card's own error/empty state.
    const { from, to } = defaultAnalyticsRange();
    const anchorDate = todayAnchorDate();
    const query = { householdId, from, to };

    await Promise.all([
      queryClient
        .prefetchQuery(
          getEconomyCategoryTrendOptions({ client: serverClient, query }),
        )
        .catch(() => undefined),
      queryClient
        .prefetchQuery(
          getEconomySpendBreakdownOptions({ client: serverClient, query }),
        )
        .catch(() => undefined),
      queryClient
        .prefetchQuery(
          getEconomyIncomeVsExpenseOptions({ client: serverClient, query }),
        )
        .catch(() => undefined),
      queryClient
        .prefetchQuery(
          getEconomyVarianceHistoryOptions({ client: serverClient, query }),
        )
        .catch(() => undefined),
      queryClient
        .prefetchQuery(
          getEconomyTopTransactionsOptions({
            client: serverClient,
            query: { ...query, limit: DEFAULT_TOP_LIMIT },
          }),
        )
        .catch(() => undefined),
      queryClient
        .prefetchQuery(
          getEconomyPeriodComparisonOptions({
            client: serverClient,
            query: { householdId, anchorDate },
          }),
        )
        .catch(() => undefined),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnalyticsPage />
    </HydrationBoundary>
  );
}
