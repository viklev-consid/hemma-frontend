import "server-only";

import { getHousehold } from "@/api/generated";
import { serverClient } from "@/api/server-client";

/**
 * Resolve a household slug to its GUID, server-side.
 *
 * Economy reads scope by `householdId` (a query param), but the URL only
 * carries the slug. Server components need the GUID to prefetch economy
 * queries for first-paint hydration. On the client, components read it from
 * `useHousehold()` instead — never call this from a client component
 * (it imports the server-only backend client).
 *
 * Returns `null` if the household can't be resolved (e.g. 404); callers should
 * skip prefetch and let the household shell handle the not-found case.
 */
export async function resolveHouseholdId(slug: string): Promise<string | null> {
  const { data } = await getHousehold({
    client: serverClient,
    path: { householdRef: slug },
  });
  return data?.householdId ?? null;
}
