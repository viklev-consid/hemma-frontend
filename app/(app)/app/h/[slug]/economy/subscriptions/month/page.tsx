import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import { getEconomySubscriptionMonthCalendarOptions } from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { MonthCalendarPage } from "@/components/economy/month-calendar-page";
import { todayAnchorDate } from "@/lib/economy/anchor-date";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("subscriptionsMonth") };
}

export default async function EconomySubscriptionsMonthPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();
  const householdId = await resolveHouseholdId(slug);

  if (householdId) {
    // Prefetch the default (current) month anchor only — `?month=` stepping
    // refetches client-side. Default from the server-safe anchor module, not
    // the client-only nuqs parsers.
    await queryClient
      .prefetchQuery(
        getEconomySubscriptionMonthCalendarOptions({
          client: serverClient,
          query: { householdId, month: todayAnchorDate() },
        }),
      )
      .catch(() => undefined);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MonthCalendarPage />
    </HydrationBoundary>
  );
}
