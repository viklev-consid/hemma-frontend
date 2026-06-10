"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Cell, Pie, PieChart } from "recharts";

import { getEconomySpendBreakdownOptions } from "@/api/generated/@tanstack/react-query.gen";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  chartColor,
  formatPlotMoney,
  toPlotValue,
} from "@/lib/economy/analytics";
import { useHousehold } from "@/lib/household-context";

import { ChartCard } from "./analytics-card";
import { Money } from "./money";

/**
 * Spend breakdown — a donut of categorized expenses. Geometry comes from
 * `toPlotValue(slice.value)`; the legend renders the backend's `label`,
 * `<Money>` amount, and `sharePercent` (coerced for display only — never
 * recomputed). Uncategorized spend is absent by contract (resolved-Q #3) and we
 * add no client "other" slice; a Savings allocation renders like any other
 * slice (resolved-Q #4). Slices arrive sorted by value desc.
 */
export function SpendBreakdownChart({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const t = useTranslations("economy.analytics.spendBreakdown");
  const { householdId } = useHousehold();

  const { data, isPending, isError } = useQuery(
    getEconomySpendBreakdownOptions({ query: { householdId, from, to } }),
  );

  const slices = (data?.slices ?? []).map((slice) => ({
    ...slice,
    plot: toPlotValue(slice.value),
  }));

  // Labels only — colors are applied per-Cell so backend keys never reach CSS.
  const config = Object.fromEntries(
    slices.map((slice) => [slice.categoryId, { label: slice.label }]),
  ) satisfies ChartConfig;

  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      isLoading={isPending}
      isError={isError}
      isEmpty={slices.length === 0}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <ChartContainer
          config={config}
          className="mx-auto aspect-square w-full max-w-56"
        >
          <PieChart accessibilityLayer>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="label"
                  hideLabel
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatPlotMoney(value as number)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={slices}
              dataKey="plot"
              nameKey="label"
              innerRadius="55%"
              strokeWidth={2}
            >
              {slices.map((slice, index) => (
                <Cell key={slice.categoryId} fill={chartColor(index)} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <ul className="grid gap-1.5 text-xs">
          {slices.map((slice, index) => (
            <li
              key={slice.categoryId}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: chartColor(index) }}
                />
                <span className="text-muted-foreground">{slice.label}</span>
              </span>
              <span className="flex items-center gap-2">
                <Money value={slice.value} className="font-medium" />
                <span className="text-muted-foreground tabular-nums">
                  {t("share", { percent: Number(slice.sharePercent) })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
