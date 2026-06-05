"use client";

import { useActiveOrg } from "@/lib/active-org-context";
import { ACCESS_MODE } from "@/lib/org-access-mode";
import { useOrgOptional } from "@/lib/org-context";
import { useHasOrgPermission } from "@/lib/org-permissions";

/**
 * Permission check for the currently-active org that respects
 * PlatformOverride.
 *
 * **Use this for any per-org UI gate that might be rendered for a
 * platform admin acting under override** — the global sidebar's
 * contextual section is the obvious case, but so is any cross-app
 * affordance whose presence depends on a scoped permission within the
 * active org.
 *
 * Why not just `<Can inOrg={activeOrg.organizationId} permission={X}>`?
 * Override admins are **not in `/v1/organizations/my`** — by design.
 * `ActiveOrgProvider` synthesises a `MyOrganizationItem` for them so
 * the sidebar still has something to render, but its `permissions`
 * array is necessarily empty. A raw `<Can>` would therefore hide every
 * permission-gated entry from a platform admin browsing an org they're
 * not a member of, even though the backend would happily honour their
 * actions.
 *
 * Resolution order:
 *   1. Inside an org shell where `accessMode === PlatformOverride` →
 *      grant. The backend remains the actual gate; we just don't
 *      pre-block the UI.
 *   2. Otherwise → delegate to the standard `useHasOrgPermission`
 *      against the active org's id.
 *   3. No active org → false.
 *
 * The non-hook companion `hasOrgPermission(client, ...)` from
 * `lib/org-permissions.ts` does NOT carry this override-aware
 * behaviour. If you need a non-hook check inside an event handler
 * AND the call might run for a platform admin, branch on
 * `org.accessMode` explicitly.
 */
export function useCanInActiveOrg(permission: string): boolean {
  const orgContext = useOrgOptional();
  const { activeOrg } = useActiveOrg();
  // Always call the underlying hook so React's rules-of-hooks stay
  // happy — the hook itself short-circuits on a null orgId.
  const scopedCan = useHasOrgPermission(
    activeOrg?.organizationId ?? null,
    permission,
  );

  if (orgContext?.accessMode === ACCESS_MODE.PlatformOverride) {
    return true;
  }

  return scopedCan;
}
