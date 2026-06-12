"use client";

import { PROPERTY_PERMISSION } from "@/lib/household-permission-strings";
import { useHasHouseholdPermission } from "@/lib/household-permissions";

/**
 * Single chokepoint for "can the caller write Property data in this household?".
 *
 * Every Property write affordance (create/edit/delete/status/complete/skip/
 * promote/upload) gates through this hook rather than referencing
 * `PROPERTY_PERMISSION.Write` inline, so a future owner-only split is a
 * one-file change. Subscribes to `/v1/households/my` via the standard hook, so
 * it re-renders when scoped permissions refresh (e.g. after a role change).
 *
 * Pass the `householdId` from `useHousehold()`. For event-handler (non-render)
 * checks use the non-hook `hasHouseholdPermission(qc, …)` instead — see
 * `lib/AGENTS.md` (subscribe vs peek).
 */
export function useCanWriteProperty(
  householdId: string | undefined | null,
): boolean {
  return useHasHouseholdPermission(householdId, PROPERTY_PERMISSION.Write);
}
