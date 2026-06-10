import { createParser, parseAsInteger, parseAsString } from "nuqs";

import { parseAsAnchorDate } from "./nuqs-parsers";
import {
  DEFAULT_CHARGE_PAGE_SIZE,
  isValidScheduleYear,
} from "./subscription-calendar";

/**
 * URL-state parsers for the subscription surfaces. **Client-only** (nuqs
 * `createParser`) — same boundary rule as `transaction-filters.ts`: never
 * import into a server component. Server prefetch defaults come from the
 * server-safe `subscription-calendar.ts` / `anchor-date.ts` instead.
 */

/** A `?year=` within the schedule bounds (rejects junk like `?year=99999`). */
export const parseAsScheduleYear = createParser({
  parse(query: string): number | null {
    const value = Number(query);
    return isValidScheduleYear(value) ? value : null;
  },
  serialize(value: number): string {
    return String(value);
  },
});

/**
 * Board state: `?subscription=` is the expanded charge-history target;
 * `?chargePage=`/`?chargePageSize=` page that panel (defaults mirror the
 * backend's `1`/`50` — the response's echoed values stay authoritative for
 * rendering, these only seed the request).
 */
export const subscriptionBoardParsers = {
  subscription: parseAsString,
  chargePage: parseAsInteger.withDefault(1),
  chargePageSize: parseAsInteger.withDefault(DEFAULT_CHARGE_PAGE_SIZE),
} as const;

/**
 * Year payment schedule: `?year=`. The default (`currentYear()`) is applied
 * at the call site with `.withDefault(...)` so it reflects render time, not
 * module-load time.
 */
export const subscriptionScheduleParsers = {
  year: parseAsScheduleYear,
} as const;

/**
 * Month charge calendar: `?month=` is a full ISO **anchor date** inside the
 * target month (the backend resolves the month — exactly the budget
 * `anchorDate` pattern). Default (`todayAnchorDate()`) applied at the call
 * site for the same reason as `year`.
 */
export const subscriptionMonthParsers = {
  month: parseAsAnchorDate,
} as const;
