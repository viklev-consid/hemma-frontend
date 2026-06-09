import type { AccountType, TransferMode } from "@/api/generated";

/**
 * Transfer mode constants. `Neutral` = movement between accounts (reads as a
 * movement, never as spending). `Savings` = a savings allocation (shows under
 * Sparande; may carry an optional category). PascalCase to match the backend
 * enum exactly.
 */
export const TRANSFER_MODE = {
  Neutral: "Neutral",
  Savings: "Savings",
} as const satisfies Record<TransferMode, TransferMode>;

/**
 * Default mode for a transfer given the destination account type. A transfer
 * into a `Savings` account defaults to a savings allocation; the user can
 * override. Everything else defaults to a neutral movement.
 */
export function defaultTransferMode(
  destinationAccountType: AccountType | undefined,
): TransferMode {
  return destinationAccountType === "Savings"
    ? TRANSFER_MODE.Savings
    : TRANSFER_MODE.Neutral;
}
