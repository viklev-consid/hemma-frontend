import type { ReactNode } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { listPropertyProjectsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { PropertyShell } from "@/components/property/property-shell";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { createQueryClient } from "@/lib/query-client";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function PropertyLayout({
  children,
  params,
}: LayoutProps) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  // Resolve slug → householdId so we can warm the route-critical first-paint
  // query (the projects list — property's daily-driver landing). A failed
  // prefetch is swallowed: the client re-runs the query and the household shell
  // handles a not-found household. `resolveHouseholdId` is generic, not
  // economy-specific (it just maps slug → GUID), so it's imported, not copied.
  const householdId = await resolveHouseholdId(slug);
  if (householdId) {
    await queryClient
      .prefetchQuery(
        listPropertyProjectsOptions({
          client: serverClient,
          query: { householdId },
        }),
      )
      .catch(() => undefined);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PropertyShell>{children}</PropertyShell>
    </HydrationBoundary>
  );
}
