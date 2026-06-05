import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { serverClient } from "@/api/server-client";
import { getAuditTrailOptions } from "@/api/generated/@tanstack/react-query.gen";
import { AuditTrail } from "@/components/admin/audit-trail";
import { createQueryClient } from "@/lib/query-client";
import { requireServerPermission } from "@/lib/server-auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.admin");
  return { title: t("auditTrail") };
}

const PAGE_SIZE = 20;

function toPositiveInteger(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : 1;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    actorId?: string | string[];
    eventType?: string | string[];
    page?: string | string[];
  }>;
}) {
  await requireServerPermission("audit.trail.read");
  const params = await searchParams;
  const actorId = firstValue(params.actorId)?.trim();
  const eventType = firstValue(params.eventType)?.trim();
  const page = toPositiveInteger(params.page);
  const queryClient = createQueryClient();

  await queryClient.prefetchQuery(
    getAuditTrailOptions({
      client: serverClient,
      query: {
        page,
        pageSize: PAGE_SIZE,
        ...(actorId ? { actorId } : {}),
        ...(eventType ? { eventType } : {}),
      },
    }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <AuditTrail />
      </Suspense>
    </HydrationBoundary>
  );
}
