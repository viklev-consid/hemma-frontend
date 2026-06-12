import { parseAsString, parseAsStringLiteral } from "nuqs";

import { PROJECT_STATUS_OPTIONS } from "./enums";

/**
 * URL filter state for the projects list (mirrors the Economy `nuqs` filter
 * convention). `status` is constrained to the generated `ProjectStatus`
 * values via `parseAsStringLiteral` — an unknown value in the URL parses to
 * `null` (no filter) rather than reaching the backend as a 422. `area` is free
 * text. Both parse to `null` when absent, so the consuming component reads
 * `filters.x ?? undefined` when building the query.
 */
export const projectFilterParsers = {
  status: parseAsStringLiteral(PROJECT_STATUS_OPTIONS),
  area: parseAsString,
} as const;
