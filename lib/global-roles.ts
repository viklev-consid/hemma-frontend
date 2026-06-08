/**
 * Global (platform-wide) user roles.
 *
 * Distinct from `lib/household-roles.ts`, which covers per-household roles.
 * The backend gates platform-admin endpoints (e.g. `ChangeUserRole`,
 * documented as "Admin only") on this role value directly — there is no
 * fine-grained permission string for these.
 *
 * Values are aligned to the generated `PlatformRole` enum (`'admin' | 'user'`,
 * lowercase) via the `satisfies` check, so a backend casing/rename change
 * surfaces as a TS error here instead of silently flipping admin affordances
 * off. (The pre-rename catalog used Title-Case `"Admin"`/`"User"`; the
 * generated contract is lowercase — see the `platform-role-casing` follow-up
 * if a runtime mismatch surfaces.)
 */

import type { PlatformRole } from "@/api/generated";

export const GLOBAL_ROLE = {
  Admin: "admin",
  User: "user",
} as const satisfies Record<string, PlatformRole>;

export type GlobalRole = (typeof GLOBAL_ROLE)[keyof typeof GLOBAL_ROLE];
