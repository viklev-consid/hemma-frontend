import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import { listHouseholdInvitationsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { serverClient } from "@/api/server-client";
import { InvitationsTable } from "@/components/households/invitations-table";
import { createQueryClient } from "@/lib/query-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.households");
  return { title: t("invitations") };
}

export default async function InvitationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  await queryClient
    .prefetchQuery(
      listHouseholdInvitationsOptions({
        client: serverClient,
        path: { householdRef: slug },
      }),
    )
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvitationsTable />
    </HydrationBoundary>
  );
}
