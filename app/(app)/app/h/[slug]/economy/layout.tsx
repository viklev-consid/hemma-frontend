import type { ReactNode } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getEconomySettingsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { EconomyShell } from "@/components/economy/economy-shell";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { createQueryClient } from "@/lib/query-client";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function EconomyLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  // Resolve slug → householdId so we can prefetch the first-run discriminator.
  // A failed prefetch (404 = uninitialized, or household not found) is swallowed:
  // the client `EconomyShell` re-runs the query and handles both the
  // uninitialized redirect and the not-found case.
  const householdId = await resolveHouseholdId(slug);
  if (householdId) {
    await queryClient
      .prefetchQuery(
        getEconomySettingsOptions({
          client: serverClient,
          query: { householdId },
        }),
      )
      .catch(() => undefined);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EconomyShell slug={slug}>{children}</EconomyShell>
    </HydrationBoundary>
  );
}
