import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import { listEconomyCategoriesOptions } from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { BudgetPage } from "@/components/economy/budget-page";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("budget") };
}

export default async function EconomyBudgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();
  const householdId = await resolveHouseholdId(slug);

  if (householdId) {
    await queryClient
      .prefetchQuery(
        listEconomyCategoriesOptions({
          client: serverClient,
          query: { householdId },
        }),
      )
      .catch(() => undefined);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BudgetPage />
    </HydrationBoundary>
  );
}
