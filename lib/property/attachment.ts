/**
 * Project-attachment file validation. The backend attach is a one-step
 * multipart upload; the FE owns the pre-submit checks (type + size) so the user
 * gets a friendly error before a wasted round-trip. Anything that slips through
 * still returns 422 from the backend, mapped by the standard ProblemDetails
 * handler.
 *
 * Per the Property plan (§1.10): accept PDF / JPEG / PNG / WebP, max 10 MB,
 * reject empty. (Mirrors `lib/economy/receipt.ts`, which additionally has no
 * WebP — attachments are broader than receipts.)
 */

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed MIME types for a project attachment upload. */
export const ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Value for an `<input type="file" accept=...>` matching the allowed types. */
export const ATTACHMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

export function isAllowedAttachmentType(file: File): boolean {
  return (ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type);
}

/** True when the file is non-empty and within the size cap. */
export function isWithinAttachmentSize(file: File): boolean {
  return file.size > 0 && file.size <= ATTACHMENT_MAX_BYTES;
}

export type AttachmentValidationError = "type" | "size" | "empty";

/**
 * Validate a candidate attachment file. Returns `null` when valid, or a reason
 * code the caller maps to a localized message.
 */
export function validateAttachmentFile(
  file: File,
): AttachmentValidationError | null {
  if (file.size === 0) return "empty";
  if (!isAllowedAttachmentType(file)) return "type";
  if (file.size > ATTACHMENT_MAX_BYTES) return "size";
  return null;
}
