/**
 * Organization roles and rank helpers.
 *
 * The backend exposes roles as bare lowercase strings (no enum in the
 * OpenAPI spec). This module is the single source of truth for the role
 * list and the rank comparisons used to enforce role-escalation rules
 * client-side.
 *
 * Rank is highest-wins: owner > admin > member.
 *
 * All comparisons are case-insensitive at the entry point — the backend
 * is authoritative for the literal value, but we normalise to lowercase
 * here so a defensive `Role` capitalisation slipping through doesn't
 * accidentally drop someone to rank 0.
 *
 * Backend errors (`Organizations.Role.EscalationForbidden`,
 * `Organizations.Owner.LastOwnerRequired`) remain the source of truth; the
 * helpers here exist to hide UI affordances that would deterministically fail.
 */

export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

const RANK: Record<OrgRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function isOrgRole(value: string): value is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(value.toLowerCase());
}

export function roleRank(role: string): number {
  const normalised = role.toLowerCase();
  return (RANK as Record<string, number>)[normalised] ?? 0;
}

/**
 * Roles the caller is permitted to assign or invite at.
 *
 * The backend forbids assigning a role at or above the caller's own rank
 * (returns `Organizations.Role.EscalationForbidden`). Strictly below, never
 * equal.
 */
export function rolesBelow(callerRole: string): OrgRole[] {
  const callerRank = roleRank(callerRole);
  return ORG_ROLES.filter((role) => RANK[role] < callerRank);
}

/**
 * Capitalised label for display (e.g. "owner" → "Owner"). The backend
 * stores lowercase but UX wants Title Case in copy.
 */
export function formatRoleLabel(role: string): string {
  if (!role) return role;
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function isHigherOrEqualRank(a: string, b: string): boolean {
  return roleRank(a) >= roleRank(b);
}
