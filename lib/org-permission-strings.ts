/**
 * Canonical scoped-permission strings emitted by the Organizations module.
 *
 * Sourced from `MyOrganizationItem.permissions` returned by
 * `GET /v1/organizations/my`. The backend's namespace is
 * `organizations.<resource>.<action>`, where the outer `organizations` is
 * the module name and the inner `organizations` (yes, repeated) is the
 * resource within that module.
 *
 * Use these constants in `<Can permission=... inOrg=...>` calls instead of
 * inline strings — that way a backend rename surfaces as a TS error here,
 * not as silently-failing guards across the UI.
 */
export const ORG_PERMISSION = {
  OrgRead: "organizations.organizations.read",
  OrgWrite: "organizations.organizations.write",
  OrgDelete: "organizations.organizations.delete",
  MembersRead: "organizations.members.read",
  MembersManage: "organizations.members.manage",
  InvitationsManage: "organizations.invitations.manage",
  AuditRead: "organizations.audit.read",
} as const;

export type OrgPermission =
  (typeof ORG_PERMISSION)[keyof typeof ORG_PERMISSION];
