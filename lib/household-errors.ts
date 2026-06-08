"use client";

import { problemHasErrorCode, type ProblemDetails } from "@/api/problems";

/**
 * Named constants for the Households module's RFC 9457 problem codes.
 *
 * Mirrors the backend's error catalog (confirmed 2026-06-08). Call sites use
 * `problemHasErrorCode` to branch on these — the backend already ships
 * localized `title`/`detail` strings, so we don't keep a copy dictionary here.
 *
 * ⚠️ Discriminator caveat: most household non-validation endpoints currently
 * expose only `title/status/detail` — NOT `extensions.errorCode`. Only
 * validation errors (code as an `errors` key) and a few Users flows (e.g.
 * `Households.Owner.UserErasureBlocked` via `extensions.errorCode`) carry a
 * machine-readable code. `problemHasErrorCode` returns `false` when no code
 * is present, so callers must degrade to status-based generic messaging.
 * Tracked as the `household-errorcode-exposure` follow-up.
 *
 * Note: the old `Organizations.Role.EscalationForbidden` has no 1:1 successor
 * — role escalation now surfaces as `Households.Role.Invalid` or
 * `Households.PlatformOverride.MutationForbidden` depending on the path.
 */
export const HOUSEHOLD_ERRORS = {
  NotFound: "Households.Household.NotFound",
  Deleted: "Households.Household.Deleted",
  SlugAlreadyExists: "Households.Slug.AlreadyExists",
  LastOwnerRequired: "Households.Owner.LastOwnerRequired",
  UserErasureBlocked: "Households.Owner.UserErasureBlocked",
  RoleInvalid: "Households.Role.Invalid",
  PlatformOverrideMutationForbidden:
    "Households.PlatformOverride.MutationForbidden",
  InvitationInvalid: "Households.Invitation.Invalid",
  InvitationAlreadyAccepted: "Households.Invitation.AlreadyAccepted",
  InvitationAlreadyRevoked: "Households.Invitation.AlreadyRevoked",
} as const;

export type HouseholdErrorCode =
  (typeof HOUSEHOLD_ERRORS)[keyof typeof HOUSEHOLD_ERRORS];

/**
 * User-registration unavailability surfaced during invite-accept. This is a
 * Users-module code, not household-owned — kept here only because the invite
 * landing handles it alongside the household invitation errors.
 */
export const USER_ERRORS = {
  RegistrationUnavailable: "Users.Registration.Unavailable",
} as const;

export type UserErrorCode =
  (typeof USER_ERRORS)[keyof typeof USER_ERRORS];

export function isHouseholdError(
  problem: ProblemDetails,
  code: HouseholdErrorCode,
): boolean {
  return problemHasErrorCode(problem, code);
}

/**
 * Shape of the extension payload on `Households.Owner.UserErasureBlocked`.
 *
 * The backend lists every household that's preventing account deletion so the
 * UI can route to a remediation page (transfer ownership / delete household).
 * `isSoleOwner` is `true` when the user is the only active owner — those rows
 * are the hard blockers; the others appear when the user owns the household
 * but at least one co-owner exists (still preventing deletion in v1, but
 * transferable without destroying the household).
 */
export type BlockingHousehold = {
  householdId: string;
  name: string;
  slug: string;
  role: string;
  isSoleOwner: boolean;
};

export function extractBlockingHouseholds(
  problem: ProblemDetails,
): BlockingHousehold[] {
  // Backends vary on extension placement (top-level vs `extensions`) and the
  // rename may land the key as either `blockingHouseholds` or the legacy
  // `blockingOrganizations`. Accept all combinations defensively.
  const record = problem as unknown as Record<string, unknown>;
  const candidate =
    record.blockingHouseholds ??
    record.blockingOrganizations ??
    problem.extensions?.blockingHouseholds ??
    problem.extensions?.blockingOrganizations;
  return Array.isArray(candidate) ? (candidate as BlockingHousehold[]) : [];
}
