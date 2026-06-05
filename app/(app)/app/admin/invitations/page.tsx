import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import { serverClient } from "@/api/server-client";
import { listInvitationsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { InvitationsPage } from "@/components/admin/invitations-page";
import { createQueryClient } from "@/lib/query-client";
import { requireServerPermission } from "@/lib/server-auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.admin");
  return { title: t("invitations") };
}

export default async function AdminInvitationsPage() {
  await requireServerPermission("users.invitations.write");
  const queryClient = createQueryClient();

  await queryClient.prefetchQuery(
    listInvitationsOptions({ client: serverClient }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvitationsPage />
    </HydrationBoundary>
  );
}
