"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";

import {
  listMyOrganizationsOptions,
  listMyOrganizationsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type {
  ListMyOrganizationsResponse,
  MyOrganizationItem,
} from "@/api/generated";

/**
 * Scoped (per-organization) permission helpers.
 *
 * Scoped permissions are NOT carried in the JWT and NOT in `/v1/users/me` — the
 * global permissions array there is for platform-level checks only.
 *
 * Per-org permissions live on `MyOrganizationItem.permissions` returned by
 * `GET /v1/organizations/my`. Every entry also carries a `permissionsVersion`
 * hash; we re-fetch `/my` after writes that could change scope (role change,
 * accept-invite, create/delete) instead of polling the version directly.
 *
 * Platform admins acting under `accessMode: "PlatformOverride"` will NOT appear
 * in `/my`. Their reads succeed but `hasOrgPermission` returns `false` for any
 * lookup keyed on that org — guards should additionally key off the
 * `accessMode` returned by the per-org `GET` for the page they're rendering.
 */

function readMyOrganizationsFromCache(
  client: QueryClient,
): MyOrganizationItem[] {
  // The query key is parameterless ({}), so a single lookup is enough.
  const data = client.getQueryData<ListMyOrganizationsResponse>(
    listMyOrganizationsQueryKey(),
  );
  return data?.organizations ?? [];
}

export function findMyOrganization(
  client: QueryClient,
  organizationId: string,
): MyOrganizationItem | undefined {
  return readMyOrganizationsFromCache(client).find(
    (org) => org.organizationId === organizationId,
  );
}

export function findMyOrganizationBySlug(
  client: QueryClient,
  slug: string,
): MyOrganizationItem | undefined {
  return readMyOrganizationsFromCache(client).find((org) => org.slug === slug);
}

/**
 * Pure form — useful in tests and non-React callers.
 *
 * Returns `false` for unknown orgs. Callers wanting to distinguish "you're not
 * a member" from "you are a member without this permission" should additionally
 * check `findMyOrganization(...)`.
 */
export function hasOrgPermission(
  client: QueryClient,
  organizationId: string,
  permission: string,
): boolean {
  const org = findMyOrganization(client, organizationId);
  return org ? org.permissions.includes(permission) : false;
}

/**
 * Subscribe to `/v1/organizations/my` and project it down to the single
 * boolean a guard needs. Subscribing (vs reading the cache) means the
 * consuming component re-renders when `/my` refreshes — for example after
 * a role change or accept-invite — instead of staying stale until some
 * unrelated state nudges it.
 */
export function useHasOrgPermission(
  organizationId: string | undefined | null,
  permission: string,
): boolean {
  const { data } = useQuery({
    ...listMyOrganizationsOptions(),
    select: (response) =>
      organizationId
        ? (response.organizations
            .find((org) => org.organizationId === organizationId)
            ?.permissions.includes(permission) ?? false)
        : false,
  });
  return data ?? false;
}

export function useMyOrganization(
  organizationId: string | undefined | null,
): MyOrganizationItem | undefined {
  const { data } = useQuery({
    ...listMyOrganizationsOptions(),
    select: (response) =>
      organizationId
        ? response.organizations.find(
            (org) => org.organizationId === organizationId,
          )
        : undefined,
  });
  return data;
}
