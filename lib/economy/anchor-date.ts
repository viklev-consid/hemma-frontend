/**
 * Server-safe anchor-date helpers (no `nuqs` dependency).
 *
 * `anchorDate` is any `YYYY-MM-DD` date within a target cycle; the backend
 * resolves the containing period. These live apart from `nuqs-parsers.ts`
 * because that module calls `createParser()`, which is client-only — importing
 * it from a server component (e.g. a page prefetch) throws at build time.
 */

const ANCHOR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True when `value` is a `YYYY-MM-DD` date string. */
export function isValidAnchorDate(value: string): boolean {
  return ANCHOR_DATE_PATTERN.test(value);
}

/**
 * Today as a `YYYY-MM-DD` anchor, in local time. The default selected period.
 * Built from local date parts (not `toISOString()`) so a late-evening local
 * date isn't bumped to tomorrow by the UTC offset.
 */
export function todayAnchorDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
