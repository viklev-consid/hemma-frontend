import { describe, expect, it } from "vitest";

import { formatBudgetPercent } from "./budget-percent";

describe("formatBudgetPercent", () => {
  it("formats ratio values as whole percents", () => {
    expect(formatBudgetPercent(0.5484)).toBe(55);
    expect(formatBudgetPercent("0.5484")).toBe(55);
  });

  it("keeps backend whole percent values on the same scale", () => {
    expect(formatBudgetPercent(54.84)).toBe(55);
    expect(formatBudgetPercent("54.84")).toBe(55);
  });
});
