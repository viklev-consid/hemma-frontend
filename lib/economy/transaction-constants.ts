/**
 * Server-safe transaction constants (no `nuqs`). Kept apart from
 * `transaction-filters.ts` so server components (page prefetch) can import the
 * page size without pulling in the client-only nuqs parsers.
 */
export const DEFAULT_TRANSACTION_PAGE_SIZE = 20;
