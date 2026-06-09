import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import {
  getEconomyBudgetSummaryOptions,
  listEconomyCategoriesOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { BudgetPage } from "@/components/economy/budget-page";
import { isValidAnchorDate, todayAnchorDate } from "@/lib/economy/anchor-date";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("budget") };
}

export default async function EconomyBudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { slug } = await params;
  const { period } = await searchParams;
  const queryClient = createQueryClient();
  const householdId = await resolveHouseholdId(slug);

  // Match the client's nuqs default so the prefetched query key lines up.
  const anchorDate =
    period && isValidAnchorDate(period) ? period : todayAnchorDate();

  if (householdId) {
    await Promise.all([
      queryClient
        .prefetchQuery(
          getEconomyBudgetSummaryOptions({
            client: serverClient,
            query: { householdId, anchorDate },
          }),
        )
        .catch(() => undefined),
      queryClient
        .prefetchQuery(
          listEconomyCategoriesOptions({
            client: serverClient,
            query: { householdId },
          }),
        )
        .catch(() => undefined),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BudgetPage />
    </HydrationBoundary>
  );
}
