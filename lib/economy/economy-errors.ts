"use client";

import { problemHasErrorCode, type ProblemDetails } from "@/api/problems";

/**
 * Named constants for the Economy module's RFC 9457 problem codes the UI
 * branches on. Mirrors `lib/household-errors.ts`: a const catalog + predicate
 * helper, so a backend rename surfaces as a TypeScript error instead of a
 * silently broken guard. The backend ships localized `title`/`detail` strings
 * — no copy dictionary here.
 *
 * `TransactionAlreadyLinked` (409 on link): the transaction is linked to a
 * **different** subscription. Re-linking to the *same* subscription is an
 * idempotent 200, so this code only fires cross-subscription; the documented
 * remedy is unlink-then-relink. Call sites branch on it *before* falling back
 * to the generic `handleProblem` toast.
 */
export const ECONOMY_ERRORS = {
  TransactionAlreadyLinked: "Economy.Transaction.AlreadyLinked",
} as const;

export type EconomyErrorCode =
  (typeof ECONOMY_ERRORS)[keyof typeof ECONOMY_ERRORS];

export function isEconomyError(
  problem: ProblemDetails,
  code: EconomyErrorCode,
): boolean {
  return problemHasErrorCode(problem, code);
}
