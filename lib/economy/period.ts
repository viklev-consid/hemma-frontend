import { ECONOMY_LOCALE } from "./money";

/**
 * Period display helpers — **labels only, no period math.** The backend owns
 * period boundaries (it resolves the period containing an `anchorDate` via the
 * household's `cycleStartDay`). These helpers only render strings the backend
 * already computed (`periodStartsOn` / `periodEndsOn`); they never derive a
 * period or shift a date.
 *
 * Dates are formatted with a fixed locale in UTC so the same ISO date renders
 * identically on server and client (no hydration mismatch, no off-by-one from
 * the runtime timezone shifting a date-only value).
 */

function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Render a budget period as a range label, e.g. "1 juni – 30 juni 2026".
 * Drops the year on the start when both ends share it. Falls back to the raw
 * ISO strings if either value can't be parsed.
 */
export function formatPeriodRange(
  periodStartsOn: string,
  periodEndsOn: string,
  locale: string = ECONOMY_LOCALE,
): string {
  const start = parseIsoDate(periodStartsOn);
  const end = parseIsoDate(periodEndsOn);
  if (!start || !end) {
    return `${periodStartsOn} – ${periodEndsOn}`;
  }

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(end);

  return `${startLabel} – ${endLabel}`;
}

/**
 * Format a single ISO date (`YYYY-MM-DD`) for display, e.g. "9 juni 2026".
 * Fixed locale + UTC so server and client render identically. Falls back to the
 * raw string if it can't be parsed.
 */
export function formatEconomyDate(
  isoDate: string,
  locale: string = ECONOMY_LOCALE,
): string {
  const date = parseIsoDate(isoDate);
  if (!date) return isoDate;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Step an ISO date (`YYYY-MM-DD`) by whole days, returning a new ISO date.
 *
 * This is **not** period math: it's used only to derive an *anchor* that falls
 * in the period adjacent to one the backend already returned (e.g. the day
 * before `periodStartsOn` lands in the previous period). The backend still
 * resolves the real period from that anchor. Computed in UTC so a date-only
 * value never drifts across a day boundary.
 */
export function addDays(isoDate: string, delta: number): string {
  const date = parseIsoDate(isoDate);
  if (!date) return isoDate;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
