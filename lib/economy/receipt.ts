/**
 * Receipt file validation. The backend attach is one-step multipart; the FE
 * owns the pre-submit checks (type + size) so the user gets a friendly error
 * before a wasted round-trip. The backend still returns 422 for anything that
 * slips through — that maps through the standard ProblemDetails handler.
 *
 * Per the Phase 2 plan: accept PDF / PNG / JPEG, max 10 MB, reject empty.
 */

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed MIME types for a receipt upload. */
export const RECEIPT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

/** Value for an `<input type="file" accept=...>` matching the allowed types. */
export const RECEIPT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export function isAllowedReceiptType(file: File): boolean {
  return (RECEIPT_MIME_TYPES as readonly string[]).includes(file.type);
}

/** True when the file is non-empty and within the size cap. */
export function isWithinReceiptSize(file: File): boolean {
  return file.size > 0 && file.size <= RECEIPT_MAX_BYTES;
}

export type ReceiptValidationError = "type" | "size" | "empty";

/**
 * Validate a candidate receipt file. Returns `null` when valid, or a reason
 * code the caller maps to a localized message.
 */
export function validateReceiptFile(file: File): ReceiptValidationError | null {
  if (file.size === 0) return "empty";
  if (!isAllowedReceiptType(file)) return "type";
  if (file.size > RECEIPT_MAX_BYTES) return "size";
  return null;
}
