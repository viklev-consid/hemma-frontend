import { parseAsStringLiteral } from "nuqs";

import { DEFAULT_IMPORT_STEP, IMPORT_STEPS } from "./import-step-constants";

export {
  DEFAULT_IMPORT_STEP,
  IMPORT_STEPS,
  type ImportStep,
} from "./import-step-constants";

/**
 * `?step=` parser for the import wizard. **Client-only** (`nuqs`) — same
 * boundary rule as `nuqs-parsers.ts`: never import into a server component
 * (use `import-step-constants.ts` there instead).
 */
export const parseAsImportStep =
  parseAsStringLiteral(IMPORT_STEPS).withDefault(DEFAULT_IMPORT_STEP);
