import type { NormalizedImportRowRequest } from "@/api/generated";

/**
 * Client-side field-length limits for import rows. These are **not** in the
 * generated Zod (which types the text fields as bare nullable strings) — they
 * come from the source plan and must surface as row-level errors *before*
 * preview/commit. The backend stays authoritative and returns 422 keyed per
 * field; these checks just give immediate, per-row feedback at the mapping step.
 */
export const IMPORT_FIELD_LIMITS = {
  description: 500,
  counterparty: 200,
  reference: 200,
  rawDescription: 1000,
} as const satisfies Partial<Record<keyof NormalizedImportRowRequest, number>>;

/**
 * Max rows per import. One account per import is structural (the request carries
 * a single `accountId`); the row cap is **not** in Zod (`rows` is unbounded) —
 * enforce it client-side at parse time with a clear message and let the backend
 * 422 be the backstop. Never silently drop rows past this.
 */
export const IMPORT_MAX_ROWS = 1000;

export type ImportRowFieldErrors = Partial<
  Record<keyof typeof IMPORT_FIELD_LIMITS, "tooLong">
>;

/**
 * Validate one mapped row against the field-length limits. Returns a map of
 * offending field → reason; an empty object means the row passes. Null/absent
 * values pass (length only matters when text is present).
 */
export function validateImportRow(
  row: Pick<NormalizedImportRowRequest, keyof typeof IMPORT_FIELD_LIMITS>,
): ImportRowFieldErrors {
  const errors: ImportRowFieldErrors = {};
  for (const field of Object.keys(IMPORT_FIELD_LIMITS) as Array<
    keyof typeof IMPORT_FIELD_LIMITS
  >) {
    const value = row[field];
    if (
      typeof value === "string" &&
      value.length > IMPORT_FIELD_LIMITS[field]
    ) {
      errors[field] = "tooLong";
    }
  }
  return errors;
}

/** True when any mapped row violates a field-length limit. */
export function hasFieldLengthViolations(
  rows: Array<
    Pick<NormalizedImportRowRequest, keyof typeof IMPORT_FIELD_LIMITS>
  >,
): boolean {
  return rows.some((row) => Object.keys(validateImportRow(row)).length > 0);
}
