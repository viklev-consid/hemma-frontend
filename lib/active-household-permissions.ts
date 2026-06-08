"use client";

import { useActiveHousehold } from "@/lib/active-household-context";
import { ACCESS_MODE } from "@/lib/household-access-mode";
import { useHouseholdOptional } from "@/lib/household-context";
import { useHasHouseholdPermission } from "@/lib/household-permissions";

/**
 * Permission check for the currently-active household that respects
 * PlatformOverride.
 *
 * **Use this for any per-household UI gate that might be rendered for a
 * platform admin acting under override** — the global sidebar's contextual
 * section is the obvious case, but so is any cross-app affordance whose
 * presence depends on a scoped permission within the active household.
 *
 * Why not just `<Can inHousehold={activeHousehold.householdId} permission={X}>`?
 * Override admins are **not in `/v1/households/my`** — by design.
 * `ActiveHouseholdProvider` synthesises a `MyHouseholdItem` for them so the
 * sidebar still has something to render, but its `permissions` array is
 * necessarily empty. A raw `<Can>` would therefore hide every
 * permission-gated entry from a platform admin browsing a household they're
 * not a member of, even though the backend would happily honour their actions.
 *
 * Resolution order:
 *   1. Inside a household shell where `accessMode === PlatformOverride` →
 *      grant. The backend remains the actual gate; we just don't pre-block
 *      the UI.
 *   2. Otherwise → delegate to the standard `useHasHouseholdPermission`
 *      against the active household's id.
 *   3. No active household → false.
 *
 * The non-hook companion `hasHouseholdPermission(client, ...)` from
 * `lib/household-permissions.ts` does NOT carry this override-aware
 * behaviour. If you need a non-hook check inside an event handler AND the
 * call might run for a platform admin, branch on `accessMode` explicitly.
 */
export function useCanInActiveHousehold(permission: string): boolean {
  const householdContext = useHouseholdOptional();
  const { activeHousehold } = useActiveHousehold();
  // Always call the underlying hook so React's rules-of-hooks stay happy —
  // the hook itself short-circuits on a null householdId.
  const scopedCan = useHasHouseholdPermission(
    activeHousehold?.householdId ?? null,
    permission,
  );

  if (householdContext?.accessMode === ACCESS_MODE.PlatformOverride) {
    return true;
  }

  return scopedCan;
}
