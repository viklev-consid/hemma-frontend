/**
 * Global (platform-wide) user roles.
 *
 * Distinct from `lib/household-roles.ts`, which covers per-household roles.
 * The backend gates platform-admin endpoints (e.g. `ChangeUserRole`,
 * documented as "Admin only") on this role value directly — there is no
 * fine-grained permission string for these. Centralising the literal so
 * a backend rename surfaces as TS errors at every call site instead of
 * silently flipping admin affordances off.
 */

export const GLOBAL_ROLE = {
  Admin: "Admin",
  User: "User",
} as const;

export type GlobalRole = (typeof GLOBAL_ROLE)[keyof typeof GLOBAL_ROLE];
