import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import {
  getEconomyAccountBalancesOptions,
  listEconomyAccountsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { AccountsPage } from "@/components/economy/accounts-page";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("accounts") };
}

export default async function EconomyAccountsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();
  const householdId = await resolveHouseholdId(slug);

  if (householdId) {
    // Prefetch both: balances drive the table; the account list is warmed so
    // the create-form's invalidation has a populated cache to refresh.
    await Promise.all([
      queryClient
        .prefetchQuery(
          getEconomyAccountBalancesOptions({
            client: serverClient,
            query: { householdId },
          }),
        )
        .catch(() => undefined),
      queryClient
        .prefetchQuery(
          listEconomyAccountsOptions({
            client: serverClient,
            query: { householdId },
          }),
        )
        .catch(() => undefined),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountsPage />
    </HydrationBoundary>
  );
}
