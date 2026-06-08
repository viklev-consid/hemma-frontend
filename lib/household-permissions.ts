"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";

import {
  listMyHouseholdsOptions,
  listMyHouseholdsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { ListMyHouseholdsResponse, MyHouseholdItem } from "@/api/generated";

/**
 * Scoped (per-household) permission helpers.
 *
 * Scoped permissions are NOT carried in the JWT and NOT in `/v1/users/me` —
 * the global permissions array there is for platform-level checks only.
 *
 * Per-household permissions live on `MyHouseholdItem.permissions` returned by
 * `GET /v1/households/my`. Every entry also carries a `permissionsVersion`
 * hash; we re-fetch `/my` after writes that could change scope (role change,
 * accept-invite, create/delete) instead of polling the version directly.
 *
 * Platform admins acting under `accessMode: "PlatformOverride"` will NOT
 * appear in `/my`. Their reads succeed but `hasHouseholdPermission` returns
 * `false` for any lookup keyed on that household — guards should additionally
 * key off the `accessMode` returned by the per-household `GET` for the page
 * they're rendering.
 */

function readMyHouseholdsFromCache(client: QueryClient): MyHouseholdItem[] {
  // The query key is parameterless ({}), so a single lookup is enough.
  const data = client.getQueryData<ListMyHouseholdsResponse>(
    listMyHouseholdsQueryKey(),
  );
  return data?.households ?? [];
}

export function findMyHousehold(
  client: QueryClient,
  householdId: string,
): MyHouseholdItem | undefined {
  return readMyHouseholdsFromCache(client).find(
    (household) => household.householdId === householdId,
  );
}

export function findMyHouseholdBySlug(
  client: QueryClient,
  slug: string,
): MyHouseholdItem | undefined {
  return readMyHouseholdsFromCache(client).find(
    (household) => household.slug === slug,
  );
}

/**
 * Pure form — useful in tests and non-React callers.
 *
 * Returns `false` for unknown households. Callers wanting to distinguish
 * "you're not a member" from "you are a member without this permission"
 * should additionally check `findMyHousehold(...)`.
 */
export function hasHouseholdPermission(
  client: QueryClient,
  householdId: string,
  permission: string,
): boolean {
  const household = findMyHousehold(client, householdId);
  return household ? household.permissions.includes(permission) : false;
}

/**
 * Subscribe to `/v1/households/my` and project it down to the single boolean
 * a guard needs. Subscribing (vs reading the cache) means the consuming
 * component re-renders when `/my` refreshes — for example after a role change
 * or accept-invite — instead of staying stale until some unrelated state
 * nudges it.
 */
export function useHasHouseholdPermission(
  householdId: string | undefined | null,
  permission: string,
): boolean {
  const { data } = useQuery({
    ...listMyHouseholdsOptions(),
    select: (response) =>
      householdId
        ? (response.households
            .find((household) => household.householdId === householdId)
            ?.permissions.includes(permission) ?? false)
        : false,
  });
  return data ?? false;
}

export function useMyHousehold(
  householdId: string | undefined | null,
): MyHouseholdItem | undefined {
  const { data } = useQuery({
    ...listMyHouseholdsOptions(),
    select: (response) =>
      householdId
        ? response.households.find(
            (household) => household.householdId === householdId,
          )
        : undefined,
  });
  return data;
}
