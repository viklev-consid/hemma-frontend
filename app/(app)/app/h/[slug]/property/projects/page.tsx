import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import { listPropertyProjectsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { ProjectsListPage } from "@/components/property/projects/projects-list-page";
import { resolveHouseholdId } from "@/lib/economy/resolve-household-id";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.property");
  return { title: t("projects") };
}

export default async function PropertyProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();
  const householdId = await resolveHouseholdId(slug);

  if (householdId) {
    // Warm the unfiltered list for first paint. Filtered queries (status/area)
    // use a different query key and fetch on the client when applied.
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
      <ProjectsListPage />
    </HydrationBoundary>
  );
}
