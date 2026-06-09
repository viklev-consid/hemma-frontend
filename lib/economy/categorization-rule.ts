import type {
  CategorizationRuleMatch,
  CategorizationRuleResponse,
  ImportDuplicateState,
} from "@/api/generated";

/**
 * Categorization-rule + import enums and the client-derived rule cap.
 * PascalCase to match the backend enums exactly; `as const satisfies Record<…>`
 * makes a backend rename surface as a TypeScript error at every call site
 * (mirrors `TRANSFER_MODE` / `RECURRING_BILL_TYPE`).
 */
export const RULE_MATCH = {
  Contains: "Contains",
  Regex: "Regex",
} as const satisfies Record<CategorizationRuleMatch, CategorizationRuleMatch>;

export const IMPORT_DUPLICATE_STATE = {
  None: "None",
  Exact: "Exact",
  Possible: "Possible",
} as const satisfies Record<ImportDuplicateState, ImportDuplicateState>;

/**
 * The enabled-rule cap. There is **no** server-provided cap/enabled-count field
 * — derive the count client-side for the "X / 100 enabled" badge and to disable
 * create/enable at the cap. The backend stays authoritative (422 when exceeded);
 * a mismatch should fail toward the backend's 422, not this stale number.
 */
export const RULE_ENABLED_CAP = 100;

/** Count of currently-enabled rules. */
export function enabledRuleCount(rules: CategorizationRuleResponse[]): number {
  return rules.filter((rule) => rule.enabled).length;
}

/** True when the enabled-rule count has reached the cap. */
export function isAtRuleCap(rules: CategorizationRuleResponse[]): boolean {
  return enabledRuleCount(rules) >= RULE_ENABLED_CAP;
}

/**
 * The per-row duplicate chip. The source plan names two chips — `None` is a new
 * row, both `Exact` and `Possible` collapse to "duplicate" (the type allows
 * three states; the UI folds the two duplicate states together).
 */
export function duplicateChip(state: ImportDuplicateState): "new" | "dup" {
  return state === IMPORT_DUPLICATE_STATE.None ? "new" : "dup";
}
