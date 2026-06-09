import { createParser, parseAsBoolean, parseAsString } from "nuqs";

import { isValidMoneyAmount, normalizeMoneyAmount } from "./money";
import { parseAsAnchorDate } from "./nuqs-parsers";

export { DEFAULT_TRANSACTION_PAGE_SIZE } from "./transaction-constants";

/**
 * URL-state parsers for the transaction list. All filters live in the URL so
 * they survive refresh/share. **Client-only** (nuqs `createParser`) — same
 * boundary rule as `nuqs-parsers.ts`: never import into a server component.
 *
 * Reuses `parseAsAnchorDate` for the `from`/`to` date bounds (same
 * `YYYY-MM-DD` validation as the budget period).
 */

/** A non-negative decimal money string (for the amount-range filter). */
export const parseAsAmountFilter = createParser({
  parse(query: string): string | null {
    return isValidMoneyAmount(query) ? normalizeMoneyAmount(query) : null;
  },
  serialize(value: string): string {
    return value;
  },
});

/**
 * Structured filters → `listEconomyTransactions` query params. Pagination is
 * not here: the mobile-first list uses an infinite query that manages pages
 * internally (the filters, not the scroll position, are the shareable state).
 */
export const transactionFilterParsers = {
  categoryId: parseAsString,
  payerId: parseAsString,
  from: parseAsAnchorDate,
  to: parseAsAnchorDate,
  hasReceipt: parseAsBoolean,
  minAmount: parseAsAmountFilter,
  maxAmount: parseAsAmountFilter,
} as const;

/** Free-text note search term → `searchEconomyTransactionNotes`. */
export const transactionSearchParser = {
  search: parseAsString.withDefault(""),
} as const;
