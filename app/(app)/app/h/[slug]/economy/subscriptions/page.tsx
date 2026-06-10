import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import {
  listEconomyAccountsOptions,
  listEconomySubscriptionsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { SubscriptionsBoard } from "@/components/economy/subscriptions-board";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("subscriptions") };
}

export default async function EconomySubscriptionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();
  const householdId = await resolveHouseholdId(slug);

  if (householdId) {
    // Board list + accounts (for account names on cards). Charge history and
    // link candidates are deliberately not prefetched — they load client-side
    // behind a per-subscription expand, not on first paint.
    await Promise.all([
      queryClient
        .prefetchQuery(
          listEconomySubscriptionsOptions({
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
      <SubscriptionsBoard />
    </HydrationBoundary>
  );
}
