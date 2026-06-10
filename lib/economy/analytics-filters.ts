import { parseAsString } from "nuqs";

import { parseAsAnchorDate } from "./nuqs-parsers";

/**
 * URL-state parsers for the analytics (Insights) surface. **Client-only** (nuqs
 * `createParser`) — same boundary rule as `subscription-filters.ts` / #9 in
 * `components/economy/AGENTS.md`: never import into a server component. The
 * server page prefetch derives its defaults from the server-safe
 * `analytics.ts` (`defaultAnalyticsRange` / `todayAnchorDate`) instead.
 *
 * `from`/`to`/`anchor` route through `parseAsAnchorDate` — this is what stands
 * between user-typed URL params and the backend, which **500s** on a malformed
 * date (no 422). A junk `?from=` is dropped to `null`, so the call site's
 * `.withDefault(...)` supplies a safe range and no bad date ever reaches the API.
 */

/** Shared range: `?from=` / `?to=` (defaults applied at the call site). */
export const analyticsRangeParsers = {
  from: parseAsAnchorDate,
  to: parseAsAnchorDate,
} as const;

/** Top-transactions category filter: `?category=` (a category id, or absent). */
export const topTransactionsParsers = {
  category: parseAsString,
} as const;

/** Period-comparison anchor: `?anchor=` (default `todayAnchorDate()`). */
export const periodComparisonParsers = {
  anchor: parseAsAnchorDate,
} as const;
