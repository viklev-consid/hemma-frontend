import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import {
  listEconomyCategoriesOptions,
  listEconomyTransactionsInfiniteOptions,
  listHouseholdMembersOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { TransactionsListPage } from "@/components/economy/transactions-list-page";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { DEFAULT_TRANSACTION_PAGE_SIZE } from "@/lib/economy/transaction-constants";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("transactions") };
}

export default async function EconomyTransactionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();
  const householdId = await resolveHouseholdId(slug);

  if (householdId) {
    // Prefetch the unfiltered first page (the common landing) plus the lookups
    // the rows need to resolve category/payer names. Shared filtered links
    // refetch client-side — the keys won't match, which is fine.
    await Promise.all([
      queryClient
        .prefetchInfiniteQuery({
          ...listEconomyTransactionsInfiniteOptions({
            client: serverClient,
            query: { householdId, pageSize: DEFAULT_TRANSACTION_PAGE_SIZE },
          }),
          initialPageParam: 1,
        })
        .catch(() => undefined),
      queryClient
        .prefetchQuery(
          listEconomyCategoriesOptions({
            client: serverClient,
            query: { householdId },
          }),
        )
        .catch(() => undefined),
      queryClient
        .prefetchQuery(
          listHouseholdMembersOptions({
            client: serverClient,
            path: { householdRef: slug },
          }),
        )
        .catch(() => undefined),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransactionsListPage slug={slug} />
    </HydrationBoundary>
  );
}
