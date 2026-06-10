"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import { getEconomyCategoryTrendOptions } from "@/api/generated/@tanstack/react-query.gen";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatPlotMoney,
  formatSeriesMonthLabel,
} from "@/lib/economy/analytics";
import { pivotTrendSeries } from "@/lib/economy/series";
import { useHousehold } from "@/lib/household-context";

import { ChartCard, chartColor } from "./analytics-card";

/**
 * Category trend — one line per category over a shared month axis. The trend
 * series is pivoted into Recharts rows by `pivotTrendSeries` (reshaping only —
 * no zero-fill); `connectNulls={false}` so a month a category didn't spend in
 * reads as a gap, never interpolated spending. Colors come from the palette by
 * index (not via `ChartConfig`, so category ids/names never reach raw CSS).
 */
export function CategoryTrendChart({ from, to }: { from: string; to: string }) {
  const t = useTranslations("economy.analytics.categoryTrend");
  const { householdId } = useHousehold();

  const { data, isPending, isError } = useQuery(
    getEconomyCategoryTrendOptions({ query: { householdId, from, to } }),
  );

  const series = data?.series ?? [];
  const rows = pivotTrendSeries(series);

  // Only `label` per entry — no `color`, so `ChartStyle` emits nothing and the
  // backend category id (the config key) never lands in the injected CSS.
  const config = Object.fromEntries(
    series.map((entry) => [entry.categoryId, { label: entry.categoryName }]),
  ) satisfies ChartConfig;

  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      isLoading={isPending}
      isError={isError}
      isEmpty={rows.length === 0}
    >
      <ChartContainer config={config}>
        <LineChart accessibilityLayer data={rows}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => formatSeriesMonthLabel(String(value))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) =>
                  formatSeriesMonthLabel(String(label))
                }
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {config[name as string]?.label ?? name}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatPlotMoney(value as number)}
                    </span>
                  </div>
                )}
              />
            }
          />
          {series.map((entry, index) => (
            <Line
              key={entry.categoryId}
              dataKey={entry.categoryId}
              type="monotone"
              stroke={chartColor(index)}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}
