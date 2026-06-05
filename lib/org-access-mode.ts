/**
 * AccessMode helpers.
 *
 * The backend returns `accessMode` on `GET /v1/organizations/{ref}` as a
 * string. We funnel string comparisons through this module so the magic
 * value lives in exactly one place.
 *
 * - "ScopedPermission": the caller is a member of this org and is acting
 *   under their org-scoped permissions.
 * - "PlatformOverride": the caller is a global admin acting on an org
 *   they are NOT a member of. Surface this in the UI so super-admins don't
 *   accidentally act in production orgs thinking they're a member.
 */

export const ACCESS_MODE = {
  ScopedPermission: "ScopedPermission",
  PlatformOverride: "PlatformOverride",
} as const;

export type AccessMode = (typeof ACCESS_MODE)[keyof typeof ACCESS_MODE];

export function isPlatformOverride(value: string | undefined | null): boolean {
  return value === ACCESS_MODE.PlatformOverride;
}
