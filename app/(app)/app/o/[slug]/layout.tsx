import type { ReactNode } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import {
  getOrganizationOptions,
  listMyOrganizationsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { OrgShell } from "@/components/organizations/org-shell";
import { createQueryClient } from "@/lib/query-client";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function OrgLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  // Prefetch both the membership listing (for role + scoped perms) and the
  // per-org GET (for accessMode + canonical name/slug). They're independent
  // — kick them off in parallel.
  //
  // Both calls swallow errors so a 404 on the per-org GET doesn't crash the
  // server render — the client shell handles 404 with a toast + redirect.
  await Promise.all([
    queryClient
      .prefetchQuery(listMyOrganizationsOptions({ client: serverClient }))
      .catch(() => undefined),
    queryClient
      .prefetchQuery(
        getOrganizationOptions({
          client: serverClient,
          path: { organizationRef: slug },
        }),
      )
      .catch(() => undefined),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrgShell slug={slug}>{children}</OrgShell>
    </HydrationBoundary>
  );
}
