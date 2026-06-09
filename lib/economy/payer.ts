import type { HouseholdMemberItem } from "@/api/generated";

/**
 * Payer helpers. `payerId` on transactions/transfers is a household member's
 * `userId` — there is no dedicated payer DTO. Options come from the household
 * member list; GDPR-erased members (null `userId`/`displayName`,
 * `isAnonymized`) can't be chosen but a historical `payerId` still resolves to
 * a tombstone for display.
 */

export type PayerOption = { userId: string; displayName: string };

/** Selectable payers: members with an addressable identity. */
export function payerOptionsFromMembers(
  members: HouseholdMemberItem[],
): PayerOption[] {
  return members
    .filter((member) => !member.isAnonymized && member.userId)
    .map((member) => ({
      userId: member.userId as string,
      displayName: member.displayName ?? (member.userId as string),
    }));
}

/**
 * Resolve a stored `payerId` to a display name. Returns `null` when there's no
 * payer; returns the `unknownLabel` tombstone when the payer is erased or no
 * longer in the list.
 */
export function resolvePayerName(
  members: HouseholdMemberItem[],
  payerId: string | null | undefined,
  unknownLabel: string,
): string | null {
  if (!payerId) return null;
  const match = members.find((member) => member.userId === payerId);
  if (!match || match.isAnonymized || !match.displayName) {
    return unknownLabel;
  }
  return match.displayName;
}
