import { createParser } from "nuqs";

import { isValidAnchorDate } from "./anchor-date";

export { todayAnchorDate } from "./anchor-date";

/**
 * URL-state parser for economy views. `?period=` carries the selected
 * `anchorDate` as a plain `YYYY-MM-DD` string (exactly what the API query
 * param wants); the browser does no period math.
 *
 * `nuqs`'s `createParser` is client-only — import this module only from client
 * components. Server components should use the helpers in `./anchor-date`.
 */
export const parseAsAnchorDate = createParser({
  parse(query: string): string | null {
    return isValidAnchorDate(query) ? query : null;
  },
  serialize(value: string): string {
    return value;
  },
});
