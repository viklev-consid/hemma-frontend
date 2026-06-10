import type { CategoryTrendSeriesResponse } from "@/api/generated";

import { toPlotValue } from "./analytics";

/**
 * Pure label-union / pivot helpers for multi-series charts. **Reshaping only**
 * (resolved-Q #2): these union the per-series month labels into one shared axis
 * and pivot the trend response into Recharts rows. They must never fabricate a
 * zero-amount point or sum/derive any value — the backend's series are used
 * verbatim, missing months stay missing (so `connectNulls={false}` renders
 * honest gaps rather than interpolated spending). Asserted in `series.test.ts`.
 */

/**
 * The distinct labels across every series' points, sorted ascending. Month
 * labels are `"YYYY-MM"`, which sorts lexically = chronologically, giving a
 * stable shared x-axis. Deduped; no points are added or removed.
 */
export function unionLabels(
  series: ReadonlyArray<{ points: ReadonlyArray<{ label: string }> }>,
): string[] {
  const labels = new Set<string>();
  for (const entry of series) {
    for (const point of entry.points) {
      labels.add(point.label);
    }
  }
  return [...labels].sort((a, b) => a.localeCompare(b));
}

/** A pivoted trend row: the month label plus one numeric value per category. */
export type TrendRow = { label: string } & Record<string, number | string>;

/**
 * Pivot the category-trend series into Recharts rows keyed by `categoryId`:
 * one row per label in the shared axis, each carrying `toPlotValue(point.value)`
 * for the categories that have a point at that label. Categories with no point
 * at a label are simply absent from that row (left `undefined`) — never
 * zero-filled — so each `<Line connectNulls={false}>` shows a gap there.
 */
export function pivotTrendSeries(
  series: ReadonlyArray<CategoryTrendSeriesResponse>,
): TrendRow[] {
  const labels = unionLabels(series);
  return labels.map((label) => {
    const row: TrendRow = { label };
    for (const entry of series) {
      const point = entry.points.find((p) => p.label === label);
      if (point) {
        row[entry.categoryId] = toPlotValue(point.value);
      }
    }
    return row;
  });
}
