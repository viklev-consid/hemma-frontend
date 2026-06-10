import { todayAnchorDate } from "./anchor-date";
import { ECONOMY_LOCALE } from "./money";

/**
 * Server-safe helpers for the subscription calendars (no `nuqs` — same
 * boundary rule as `anchor-date.ts`: pages import these for prefetch
 * defaults; the client-only parsers live in `subscription-filters.ts`).
 *
 * The backend owns all schedule math: which months a subscription charges
 * (year schedule) and which day a charge lands on (month calendar). These
 * helpers only label values the backend already computed, with the fixed
 * locale + UTC convention from `period.ts` so server and client render
 * identically.
 */

/** Backend charge-history paging defaults: `page=1, pageSize=50`, clamped to
 * 1–100 server-side. The response echoes the **effective** values — those
 * stay authoritative for rendering; this constant only seeds the URL param
 * default. */
export const DEFAULT_CHARGE_PAGE_SIZE = 50;

/** Sane `?year=` bounds for the payment-schedule URL param. */
export const SCHEDULE_YEAR_MIN = 2000;
export const SCHEDULE_YEAR_MAX = 2100;

/** True when `value` is a whole year within the schedule bounds. */
export function isValidScheduleYear(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= SCHEDULE_YEAR_MIN &&
    value <= SCHEDULE_YEAR_MAX
  );
}

/** The current year, derived from `todayAnchorDate()` (local time, like the
 * default budget period anchor). Default for the year payment schedule. */
export function currentYear(now: Date = new Date()): number {
  return Number(todayAnchorDate(now).slice(0, 4));
}

/**
 * Label a plain month number (1–12, `number | string` in the contract) for
 * the year-schedule grid, e.g. "jan." for 1 in `sv-SE`. Coerces with
 * `Number()` — display only, never computed with. Falls back to the raw
 * value when out of range. Anchored to a fixed non-leap reference year in
 * UTC so the label is purely a function of the month number.
 */
export function formatMonthNumber(
  month: number | string,
  locale: string = ECONOMY_LOCALE,
): string {
  const value = Number(month);
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    return String(month);
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, value - 1, 1)));
}

/**
 * Heading for the month calendar, e.g. "juni 2026", from any ISO date inside
 * the month (the `?month=` anchor or the response's `month`). Fixed locale +
 * UTC per `period.ts`. Falls back to the raw string when unparsable.
 */
export function formatMonthHeading(
  isoDate: string,
  locale: string = ECONOMY_LOCALE,
): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Derive an anchor date in an adjacent month: first day of the month
 * `delta` months away from `isoDate`'s month. This is **anchor derivation,
 * not period math** (same carve-out as `addDays` in `period.ts`) — the
 * backend still resolves the real month from the anchor. Pinning to day 1
 * avoids end-of-month drift (Jan 31 + 1 month must not skip February).
 * Computed in UTC; falls back to the input when unparsable.
 */
export function addMonthsAnchor(isoDate: string, delta: number): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1),
  );
  return next.toISOString().slice(0, 10);
}
