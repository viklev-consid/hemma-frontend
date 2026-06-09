import { describe, expect, it } from "vitest";

import { addDays, formatPeriodRange } from "./period";

describe("formatPeriodRange", () => {
  it("renders a within-year range, dropping the year on the start", () => {
    const label = formatPeriodRange("2026-06-01", "2026-06-30");
    expect(label).toBe("1 juni – 30 juni 2026");
  });

  it("keeps both years when the period crosses a year boundary", () => {
    const label = formatPeriodRange("2026-12-29", "2027-01-25");
    expect(label).toBe("29 december 2026 – 25 januari 2027");
  });

  it("falls back to raw ISO strings when a value can't be parsed", () => {
    expect(formatPeriodRange("nope", "2026-06-30")).toBe("nope – 2026-06-30");
  });
});

describe("addDays", () => {
  it("steps forward across a month boundary", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
  });

  it("steps backward across a month boundary", () => {
    expect(addDays("2026-06-01", -1)).toBe("2026-05-31");
  });

  it("returns the input unchanged when it can't be parsed", () => {
    expect(addDays("nope", 1)).toBe("nope");
  });
});
