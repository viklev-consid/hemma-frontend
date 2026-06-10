import type { MoneyResponse } from "@/api/generated";

import { ECONOMY_LOCALE } from "./money";

/**
 * Server-safe analytics helpers (no `nuqs` dependency) — the Phase 6 (Insights)
 * counterpart to `anchor-date.ts`. These feed both the server page prefetch and
 * the client chart components, so they must never import the client-only
 * `analytics-filters.ts`.
 *
 * Two contract rules from `docs/workflows/phase-6-analytics.md` are encoded here:
 *
 * - **No money math in the browser.** `toPlotValue` is the single, greppable
 *   carve-out: Recharts needs numeric y-coordinates, so we parse a money
 *   amount to a number *only* to plot it. The raw string is still rendered
 *   verbatim through `formatMoney`/`<Money>` in tooltips and legends. Never use
 *   this to sum, diff, or derive a value the backend didn't send.
 * - **Calendar-month time-series labels.** Trend / income-vs-expense / variance
 *   buckets are labeled `"YYYY-MM"` regardless of the household `cycleStartDay`
 *   (only period-comparison is cycle-aware). `formatSeriesMonthLabel` renders
 *   those labels with a fixed `sv-SE`/UTC convention and falls back to the raw
 *   label for anything that isn't `YYYY-MM` (labels are backend-owned).
 */

/** Default top-transactions page size — always sent explicitly (no server default). */
export const DEFAULT_TOP_LIMIT = 10;

/**
 * The literal lowercase label the period-comparison `series` ships
 * (resolved-Q #5). Treated as an i18n key, not display text.
 */
export const COMPARISON_SERIES_LABEL = "spend";

/** Calendar-month bucket label, e.g. `"2026-06"`. */
const MONTH_LABEL_PATTERN = /^(\d{4})-(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * The default analytics range: the first day of the month five months back
 * through today — six calendar months, matching the backend's month bucketing.
 * Built from local date parts (like `todayAnchorDate`) so a late-evening local
 * date isn't bumped a day by the UTC offset. `new Date(year, month - 5, 1)`
 * handles year rollover for early-year months.
 */
export function defaultAnalyticsRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const to = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const from = `${fromDate.getFullYear()}-${pad2(fromDate.getMonth() + 1)}-01`;
  return { from, to };
}

/**
 * Number of months back a range preset spans, as an ISO `from` date paired with
 * today. The selector offers 3 / 6 / 12; the `from` date is always the first of
 * its month so the range aligns with the month buckets.
 */
export function analyticsRangeForMonths(
  months: number,
  now: Date = new Date(),
): { from: string; to: string } {
  const to = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const fromDate = new Date(
    now.getFullYear(),
    now.getMonth() - (months - 1),
    1,
  );
  const from = `${fromDate.getFullYear()}-${pad2(fromDate.getMonth() + 1)}-01`;
  return { from, to };
}

/**
 * Parse a money amount to a number **for plotting only** (resolved-Q #8). Guards
 * a non-finite amount to `0` so a malformed value plots at the baseline rather
 * than crashing the chart; the raw string is preserved for the tooltip/legend.
 */
export function toPlotValue(money: Pick<MoneyResponse, "amount">): number {
  const numeric = Number(money.amount);
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Render a `"YYYY-MM"` series label as a short month, e.g. `"jun 2026"`. Fixed
 * `sv-SE` locale in UTC so server and client render identically (no hydration
 * mismatch, no off-by-one). Anything that isn't a valid `YYYY-MM` is returned
 * verbatim — series labels are backend-owned and may change shape.
 */
export function formatSeriesMonthLabel(
  label: string,
  locale: string = ECONOMY_LOCALE,
): string {
  const match = MONTH_LABEL_PATTERN.exec(label);
  if (!match) return label;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return label;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
