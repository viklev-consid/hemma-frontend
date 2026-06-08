/**
 * AccessMode helpers.
 *
 * The backend returns `accessMode` on `GET /v1/households/{ref}` as the
 * generated `HouseholdAccessMode` enum. We funnel string comparisons through
 * this module so the magic value lives in exactly one place.
 *
 * - "ScopedPermission": the caller is a member of this household and is
 *   acting under their household-scoped permissions.
 * - "PlatformOverride": the caller is a platform admin acting on a household
 *   they are NOT a member of. Surface this in the UI so platform admins don't
 *   accidentally act in production households thinking they're a member.
 */

import type { HouseholdAccessMode } from "@/api/generated";

export const ACCESS_MODE = {
  ScopedPermission: "ScopedPermission",
  PlatformOverride: "PlatformOverride",
} as const satisfies Record<HouseholdAccessMode, HouseholdAccessMode>;

export type AccessMode = HouseholdAccessMode;

export function isPlatformOverride(value: string | undefined | null): boolean {
  return value === ACCESS_MODE.PlatformOverride;
}
