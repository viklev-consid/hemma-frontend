/**
 * Slug helpers.
 *
 * Backend rule (mirrored client-side for early feedback only): a slug is
 * lowercase ASCII letters, digits, and single hyphens — no leading or
 * trailing hyphens, no consecutive hyphens, length 1–100.
 *
 * `^[a-z0-9]+(-[a-z0-9]+)*$`
 *
 * The backend remains the source of truth: client validation only suppresses
 * obviously-bad submits, never blocks otherwise-valid input from being tried.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 100;

export function isValidSlug(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(value)
  );
}

/**
 * Best-effort slug suggestion from a free-form name.
 *
 * Strips diacritics, lowercases, drops anything outside [a-z0-9-], collapses
 * runs of hyphens, trims leading/trailing hyphens, and truncates to the max
 * length. Returns an empty string for inputs that contain no usable
 * characters — callers should treat empty as "no suggestion".
 */
export function suggestSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);
}
