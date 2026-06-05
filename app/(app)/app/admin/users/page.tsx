import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { serverClient } from "@/api/server-client";
import { listUsersOptions } from "@/api/generated/@tanstack/react-query.gen";
import { UsersTable } from "@/components/admin/users-table";
import { createQueryClient } from "@/lib/query-client";
import { requireServerPermission } from "@/lib/server-auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.admin");
  return { title: t("users") };
}

const DEFAULT_PAGE_SIZE = 20;

function toPositiveInteger(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : 1;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    search?: string | string[];
  }>;
}) {
  await requireServerPermission("users.users.read");
  const params = await searchParams;
  const page = toPositiveInteger(params.page);
  const search = firstValue(params.search)?.trim();
  const queryClient = createQueryClient();

  await queryClient.prefetchQuery(
    listUsersOptions({
      client: serverClient,
      query: {
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        ...(search ? { search } : {}),
      },
    }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <UsersTable />
      </Suspense>
    </HydrationBoundary>
  );
}
