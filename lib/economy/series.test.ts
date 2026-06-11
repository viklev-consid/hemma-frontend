import { describe, expect, it } from "vitest";

import type { CategoryTrendSeriesResponse } from "@/api/generated";

import { pivotTrendSeries, unionLabels } from "./series";

const money = (amount: string) => ({ amount, currency: "SEK" as const });

const TREND: CategoryTrendSeriesResponse[] = [
  {
    categoryId: "cat-food",
    categoryName: "Mat",
    points: [
      { label: "2026-04", value: money("1200") },
      { label: "2026-06", value: money("1500") },
    ],
  },
  {
    categoryId: "cat-transport",
    categoryName: "Transport",
    points: [{ label: "2026-05", value: money("800") }],
  },
];

describe("unionLabels", () => {
  it("unions distinct labels across series, sorted ascending", () => {
    expect(unionLabels(TREND)).toEqual(["2026-04", "2026-05", "2026-06"]);
  });

  it("dedupes labels shared between series", () => {
    const labels = unionLabels([
      { points: [{ label: "2026-01" }, { label: "2026-02" }] },
      { points: [{ label: "2026-02" }, { label: "2026-03" }] },
    ]);
    expect(labels).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("returns an empty axis for empty series", () => {
    expect(unionLabels([])).toEqual([]);
  });
});

describe("pivotTrendSeries", () => {
  it("pivots to one row per shared label, keyed by categoryId", () => {
    const rows = pivotTrendSeries(TREND);
    expect(rows).toEqual([
      { label: "2026-04", "cat-food": 1200 },
      { label: "2026-05", "cat-transport": 800 },
      { label: "2026-06", "cat-food": 1500 },
    ]);
  });

  it("leaves missing months undefined — never zero-filled", () => {
    const rows = pivotTrendSeries(TREND);
    const may = rows.find((r) => r.label === "2026-05");
    // Transport spent in May; Food did not — so Food is absent, not 0.
    expect(may).toBeDefined();
    expect("cat-food" in may!).toBe(false);
  });

  it("does not sum or fabricate values — only echoes plot coordinates", () => {
    const rows = pivotTrendSeries(TREND);
    const total = rows.reduce(
      (acc, row) =>
        acc +
        Object.entries(row)
          .filter(([key]) => key !== "label")
          .reduce((sum, [, value]) => sum + Number(value), 0),
      0,
    );
    // 1200 + 800 + 1500 — exactly the input amounts, nothing derived.
    expect(total).toBe(3500);
  });
});
