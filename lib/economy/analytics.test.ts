import { describe, expect, it } from "vitest";

import {
  analyticsRangeForMonths,
  COMPARISON_SERIES_LABEL,
  DEFAULT_TOP_LIMIT,
  defaultAnalyticsRange,
  formatSeriesMonthLabel,
  toPlotValue,
} from "./analytics";

describe("defaultAnalyticsRange", () => {
  it("spans six calendar months: first of the month 5 back → today", () => {
    const { from, to } = defaultAnalyticsRange(new Date(2026, 5, 10)); // 2026-06-10
    expect(from).toBe("2026-01-01");
    expect(to).toBe("2026-06-10");
  });

  it("rolls the year back correctly for early-year months", () => {
    const { from, to } = defaultAnalyticsRange(new Date(2026, 1, 3)); // 2026-02-03
    expect(from).toBe("2025-09-01");
    expect(to).toBe("2026-02-03");
  });

  it("pads single-digit month and day in `to`", () => {
    const { to } = defaultAnalyticsRange(new Date(2026, 2, 5)); // 2026-03-05
    expect(to).toBe("2026-03-05");
  });
});

describe("analyticsRangeForMonths", () => {
  it("3 months = first of the month two back → today", () => {
    const { from, to } = analyticsRangeForMonths(3, new Date(2026, 5, 10));
    expect(from).toBe("2026-04-01");
    expect(to).toBe("2026-06-10");
  });

  it("12 months = first of the month eleven back → today", () => {
    const { from } = analyticsRangeForMonths(12, new Date(2026, 5, 10));
    expect(from).toBe("2025-07-01");
  });
});

describe("toPlotValue", () => {
  it("parses a decimal-string amount to a number for plotting", () => {
    expect(toPlotValue({ amount: "1849.50" })).toBe(1849.5);
    expect(toPlotValue({ amount: "0" })).toBe(0);
  });

  it("guards a non-finite amount to 0 rather than NaN", () => {
    expect(toPlotValue({ amount: "junk" })).toBe(0);
    expect(toPlotValue({ amount: "" })).toBe(0);
  });
});

describe("formatSeriesMonthLabel", () => {
  it("renders YYYY-MM as a short month + year (sv-SE, UTC)", () => {
    expect(formatSeriesMonthLabel("2026-06")).toBe("juni 2026");
    expect(formatSeriesMonthLabel("2026-01")).toBe("jan. 2026");
  });

  it("returns the raw label verbatim when not YYYY-MM", () => {
    expect(formatSeriesMonthLabel("spend")).toBe("spend");
    expect(formatSeriesMonthLabel("2026-6")).toBe("2026-6");
    expect(formatSeriesMonthLabel("2026-13")).toBe("2026-13");
  });
});

describe("constants", () => {
  it("pins the contract literals", () => {
    expect(DEFAULT_TOP_LIMIT).toBe(10);
    expect(COMPARISON_SERIES_LABEL).toBe("spend");
  });
});
