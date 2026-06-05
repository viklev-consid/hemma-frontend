import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

import { serverClient } from "@/api/server-client";
import {
  getAuditTrailOptions,
  getUserByIdOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { UserDetail } from "@/components/admin/user-detail";
import { GLOBAL_ROLE } from "@/lib/global-roles";
import { createQueryClient } from "@/lib/query-client";
import { requireServerPermission } from "@/lib/server-auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.admin");
  return { title: t("userDetail") };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, currentUser] = await Promise.all([
    params,
    requireServerPermission("users.users.read"),
  ]);
  const queryClient = createQueryClient();
  const canReadAudit = currentUser.permissions.includes("audit.trail.read");

  await Promise.all([
    queryClient.prefetchQuery(
      getUserByIdOptions({
        client: serverClient,
        path: { userId: id },
      }),
    ),
    canReadAudit
      ? queryClient.prefetchQuery(
          getAuditTrailOptions({
            client: serverClient,
            query: { actorId: id, page: 1, pageSize: 5 },
          }),
        )
      : Promise.resolve(),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserDetail
        userId={id}
        canReadAudit={canReadAudit}
        canChangeRole={currentUser.role === GLOBAL_ROLE.Admin}
      />
    </HydrationBoundary>
  );
}
