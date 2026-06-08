/**
 * Household roles and rank helpers.
 *
 * The role list is **derived from the generated client** (`zHouseholdRole`,
 * itself generated from the backend's `HouseholdRole` enum) so it can never
 * drift from the contract. The `HouseholdRole` type is the generated union
 * (`'owner' | 'member'`); this module only adds the rank comparisons used to
 * enforce role-escalation rules client-side.
 *
 * Rank is highest-wins: owner > member. (Platform `admin` is a separate
 * concept — see `lib/global-roles.ts`. It is NOT a household role.)
 *
 * All comparisons are case-insensitive at the entry point — the backend is
 * authoritative for the literal value, but we normalise to lowercase here so
 * a defensive `Role` capitalisation slipping through doesn't accidentally
 * drop someone to rank 0.
 *
 * Backend errors (role escalation surfaces as `Households.Role.Invalid` /
 * `Households.PlatformOverride.MutationForbidden`, last-owner as
 * `Households.Owner.LastOwnerRequired`) remain the source of truth; the
 * helpers here exist to hide UI affordances that would deterministically fail.
 */

import type { HouseholdRole } from "@/api/generated";
import { zHouseholdRole } from "@/api/generated/zod.gen";

export const HOUSEHOLD_ROLES = zHouseholdRole.options;

const RANK: Record<HouseholdRole, number> = {
  owner: 2,
  member: 1,
};

export function isHouseholdRole(value: string): value is HouseholdRole {
  return (HOUSEHOLD_ROLES as readonly string[]).includes(value.toLowerCase());
}

export function roleRank(role: string): number {
  const normalised = role.toLowerCase();
  return (RANK as Record<string, number>)[normalised] ?? 0;
}

/**
 * Roles the caller is permitted to assign or invite at.
 *
 * The backend forbids assigning a role at or above the caller's own rank.
 * Strictly below, never equal. With the `owner | member` model this means
 * only an owner can assign `member`; a member can assign nothing.
 */
export function rolesBelow(callerRole: string): HouseholdRole[] {
  const callerRank = roleRank(callerRole);
  return HOUSEHOLD_ROLES.filter((role) => RANK[role] < callerRank);
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
