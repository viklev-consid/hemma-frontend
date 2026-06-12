import { ECONOMY_LOCALE } from "@/lib/economy/money";

/**
 * DateOnly helpers for Property.
 *
 * Several Property fields (`targetStartDate`, `targetEndDate`, `dueDate`,
 * `anchorDate`, history `date`, task `dueDate`) are backend **DateOnly** values:
 * a calendar date with no time and no timezone, exchanged as `"YYYY-MM-DD"`
 * strings. The two cardinal rules:
 *
 * - **Never `toISOString()`** on these — it stamps a time and shifts by the
 *   local UTC offset, so a late-evening date can jump a day.
 * - **Render with a fixed locale** (`sv-SE`, reused from Economy) in UTC so the
 *   server and client produce identical output and don't trip a hydration
 *   mismatch.
 *
 * `completedAt` is a DateTimeOffset (full ISO timestamp), not a DateOnly — it's
 * display-only and stamped by the backend, so it doesn't belong here.
 */

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Format a `"YYYY-MM-DD"` DateOnly string for display, e.g. `"11 juni 2026"`.
 * Parsed in UTC so the rendered day matches the stored day regardless of the
 * viewer's timezone. Anything that isn't a valid `YYYY-MM-DD` is returned
 * verbatim — the value is backend-owned and may change shape.
 */
export function formatDateOnly(
  value: string | null | undefined,
  locale: string = ECONOMY_LOCALE,
): string {
  if (!value) return "";
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Convert a `Date` to the `"YYYY-MM-DD"` DateOnly shape the backend expects,
 * built from **local** date parts (like the date the user sees in a picker).
 * Deliberately avoids `toISOString()` so the date isn't shifted by the UTC
 * offset.
 */
export function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Today as a `"YYYY-MM-DD"` DateOnly string, from local date parts. */
export function todayDateOnly(now: Date = new Date()): string {
  return toDateOnly(now);
}
