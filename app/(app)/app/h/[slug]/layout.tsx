import type { ReactNode } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import {
  getHouseholdOptions,
  listMyHouseholdsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { HouseholdShell } from "@/components/households/household-shell";
import { createQueryClient } from "@/lib/query-client";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function HouseholdLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  // Prefetch both the membership listing (for role + scoped perms) and the
  // per-household GET (for accessMode + canonical name/slug). They're independent
  // — kick them off in parallel.
  //
  // Both calls swallow errors so a 404 on the per-household GET doesn't crash the
  // server render — the client shell handles 404 with a toast + redirect.
  await Promise.all([
    queryClient
      .prefetchQuery(listMyHouseholdsOptions({ client: serverClient }))
      .catch(() => undefined),
    queryClient
      .prefetchQuery(
        getHouseholdOptions({
          client: serverClient,
          path: { householdRef: slug },
        }),
      )
      .catch(() => undefined),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HouseholdShell slug={slug}>{children}</HouseholdShell>
    </HydrationBoundary>
  );
}
