import { describe, expect, it } from "vitest";

import type { CategorizationRuleResponse } from "@/api/generated";

import {
  duplicateChip,
  enabledRuleCount,
  IMPORT_DUPLICATE_STATE,
  isAtRuleCap,
  RULE_ENABLED_CAP,
  RULE_MATCH,
} from "./categorization-rule";

function rule(
  enabled: boolean,
  id = Math.random().toString(),
): CategorizationRuleResponse {
  return {
    categorizationRuleId: id,
    householdId: "h",
    match: RULE_MATCH.Contains,
    pattern: "ICA",
    targetCategoryId: "c",
    enabled,
  };
}

describe("enabledRuleCount", () => {
  it("counts only enabled rules", () => {
    expect(enabledRuleCount([rule(true), rule(false), rule(true)])).toBe(2);
  });

  it("is zero for an empty list", () => {
    expect(enabledRuleCount([])).toBe(0);
  });
});

describe("isAtRuleCap", () => {
  it("is false below the cap", () => {
    const rules = Array.from({ length: RULE_ENABLED_CAP - 1 }, () =>
      rule(true),
    );
    expect(isAtRuleCap(rules)).toBe(false);
  });

  it("is true at the cap", () => {
    const rules = Array.from({ length: RULE_ENABLED_CAP }, () => rule(true));
    expect(isAtRuleCap(rules)).toBe(true);
  });

  it("ignores disabled rules toward the cap", () => {
    const rules = [
      ...Array.from({ length: RULE_ENABLED_CAP }, () => rule(false)),
      rule(true),
    ];
    expect(isAtRuleCap(rules)).toBe(false);
  });
});

describe("duplicateChip", () => {
  it("maps None to new", () => {
    expect(duplicateChip(IMPORT_DUPLICATE_STATE.None)).toBe("new");
  });

  it("folds both Exact and Possible into dup", () => {
    expect(duplicateChip(IMPORT_DUPLICATE_STATE.Exact)).toBe("dup");
    expect(duplicateChip(IMPORT_DUPLICATE_STATE.Possible)).toBe("dup");
  });
});
