/**
 * Canonical scoped-permission strings emitted by the Households module.
 *
 * Sourced from `MyHouseholdItem.permissions` returned by
 * `GET /v1/households/my`. The backend's namespace is
 * `households.<resource>.<action>`, where the outer `households` is the
 * module name and the inner `households` (yes, repeated) is the resource
 * within that module.
 *
 * Owners receive all seven; members receive only the two `read` grants
 * (`households.households.read`, `households.members.read`). The declared
 * `households.platform.override` permission is NOT returned as a household
 * membership grant — it maps to the `PlatformOverride` access mode, so it
 * is intentionally absent from this catalog.
 *
 * Use these constants in `<Can permission=... inHousehold=...>` calls instead
 * of inline strings — that way a backend rename surfaces as a TS error here,
 * not as silently-failing guards across the UI.
 */
export const HOUSEHOLD_PERMISSION = {
  HouseholdRead: "households.households.read",
  HouseholdWrite: "households.households.write",
  HouseholdDelete: "households.households.delete",
  MembersRead: "households.members.read",
  MembersManage: "households.members.manage",
  InvitationsManage: "households.invitations.manage",
  AuditRead: "households.audit.read",
} as const;

export type HouseholdPermission =
  (typeof HOUSEHOLD_PERMISSION)[keyof typeof HOUSEHOLD_PERMISSION];
