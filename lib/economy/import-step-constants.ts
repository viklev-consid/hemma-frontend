/**
 * Server-safe import-wizard step constants (no `nuqs`). Kept apart from
 * `import-step.ts` so server components could import the step names without
 * pulling in the client-only nuqs parser (same split rule as
 * `transaction-constants.ts` vs `transaction-filters.ts`).
 *
 * The wizard is one route with internal steps; `?step=` selects the panel.
 * `upload` and `map` are resumable from the parsed file alone; `preview` and
 * `done` need in-memory state (parsed rows + the preview response /
 * fingerprint), so the wizard bounces back to `upload` when that state is gone.
 */
export const IMPORT_STEPS = ["upload", "map", "preview", "done"] as const;

export type ImportStep = (typeof IMPORT_STEPS)[number];

export const DEFAULT_IMPORT_STEP: ImportStep = "upload";
