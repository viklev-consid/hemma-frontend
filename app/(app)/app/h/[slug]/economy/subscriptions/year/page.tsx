import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import { getEconomySubscriptionPaymentScheduleOptions } from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { PaymentSchedulePage } from "@/components/economy/payment-schedule-page";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { currentYear } from "@/lib/economy/subscription-calendar";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("subscriptionsYear") };
}

export default async function EconomySubscriptionsYearPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();
  const householdId = await resolveHouseholdId(slug);

  if (householdId) {
    // Prefetch the default (current) year only — `?year=` navigation refetches
    // client-side. Default comes from the server-safe calendar module, never
    // from the nuqs parsers (client-only).
    await queryClient
      .prefetchQuery(
        getEconomySubscriptionPaymentScheduleOptions({
          client: serverClient,
          query: { householdId, year: currentYear() },
        }),
      )
      .catch(() => undefined);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PaymentSchedulePage />
    </HydrationBoundary>
  );
}
