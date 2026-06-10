"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { getEconomyPeriodComparisonOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { ProblemDetails } from "@/api/problems";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { todayAnchorDate } from "@/lib/economy/anchor-date";
import {
  COMPARISON_SERIES_LABEL,
  formatPlotMoney,
  toPlotValue,
} from "@/lib/economy/analytics";
import { periodComparisonParsers } from "@/lib/economy/analytics-filters";
import { addDays, formatPeriodRange } from "@/lib/economy/period";
import { useHousehold } from "@/lib/household-context";

import { ChartCard } from "./analytics-card";
import { Money } from "./money";

/**
 * Period comparison — the only cycle-aware surface. `?anchor=` selects a date;
 * the backend resolves the containing period from the household `cycleStartDay`.
 * Prev/next steppers derive the adjacent anchor by stepping one day outside the
 * backend-returned bounds (anchor derivation, not period math — the budget-page
 * convention). The `"spend"` series label maps through i18n with a raw-label
 * fallback. A 404 (settings race) renders the empty state, never a toast.
 */
export function PeriodComparisonCard() {
  const t = useTranslations("economy.analytics.periodComparison");
  const { householdId } = useHousehold();

  const [anchor, setAnchor] = useQueryState(
    "anchor",
    periodComparisonParsers.anchor.withDefault(todayAnchorDate()),
  );

  const { data, isPending, isError, error } = useQuery(
    getEconomyPeriodComparisonOptions({
      query: { householdId, anchorDate: anchor },
    }),
  );

  // Only the known `"spend"` label maps to copy; future labels fall back to the
  // raw string. Keyed explicitly so next-intl's typed keys stay satisfied.
  const seriesLabel = (label: string) =>
    label === COMPARISON_SERIES_LABEL ? t("series.spend") : label;

  const rows = (data?.series ?? []).map((item) => ({
    label: seriesLabel(item.label),
    current: toPlotValue(item.current),
    previous: toPlotValue(item.previous),
  }));

  // Data-free anchors return 200 with zero amounts — treat an all-zero
  // comparison as "not enough data" rather than render a fake zero chart.
  const hasSignal = rows.some((row) => row.current !== 0 || row.previous !== 0);

  const config = {
    previous: { label: t("previous"), color: "var(--chart-3)" },
    current: { label: t("current"), color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const steppers = (
    <div className="flex items-center gap-1">
      <Button
        size="icon-sm"
        variant="outline"
        aria-label={t("prevPeriod")}
        disabled={!data}
        onClick={() =>
          data && void setAnchor(addDays(data.currentPeriodStartsOn, -1))
        }
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        size="icon-sm"
        variant="outline"
        aria-label={t("nextPeriod")}
        disabled={!data}
        onClick={() =>
          data && void setAnchor(addDays(data.currentPeriodEndsOn, 1))
        }
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );

  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      isLoading={isPending}
      isError={isError && (error as unknown as ProblemDetails)?.status !== 404}
      isEmpty={!hasSignal}
      emptyTitle={t("empty.title")}
      emptyDescription={t("empty.description")}
      action={steppers}
    >
      {data ? (
        <div className="grid gap-3">
          <p className="text-xs text-muted-foreground">
            {formatPeriodRange(
              data.currentPeriodStartsOn,
              data.currentPeriodEndsOn,
            )}
          </p>

          <ChartContainer config={config}>
            <BarChart accessibilityLayer data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {config[name as keyof typeof config]?.label ?? name}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatPlotMoney(value as number)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="previous" fill="var(--color-previous)" radius={2} />
              <Bar dataKey="current" fill="var(--color-current)" radius={2} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>

          <ul className="grid gap-1.5 text-xs">
            {data.series.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-muted-foreground">
                  {seriesLabel(item.label)}
                </span>
                <span className="flex items-center gap-2">
                  <Money value={item.delta} className="font-medium" />
                  <Badge variant="secondary" className="tabular-nums">
                    {Number(item.deltaPercent)}%
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ChartCard>
  );
}
