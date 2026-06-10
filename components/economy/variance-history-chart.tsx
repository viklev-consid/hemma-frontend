"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import { getEconomyVarianceHistoryOptions } from "@/api/generated/@tanstack/react-query.gen";
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
  toPlotValue,
} from "@/lib/economy/analytics";
import { useHousehold } from "@/lib/household-context";

import { ChartCard } from "./analytics-card";

/**
 * Budget vs. actual — planned and actual lines per budgeted month. The backend's
 * own `variance` (planned − actual; positive = under budget) is surfaced in the
 * tooltip, not recomputed. Months in range with no budget yield an empty series
 * (200, not an error) → the empty state points at the budget editor.
 */
export function VarianceHistoryChart({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const t = useTranslations("economy.analytics.varianceHistory");
  const { householdId } = useHousehold();

  const { data, isPending, isError } = useQuery(
    getEconomyVarianceHistoryOptions({ query: { householdId, from, to } }),
  );

  const config = {
    planned: { label: t("planned"), color: "var(--chart-1)" },
    actual: { label: t("actual"), color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const rows = [...(data?.series ?? [])]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((point) => ({
      label: point.label,
      planned: toPlotValue(point.planned),
      actual: toPlotValue(point.actual),
      // Carried for the tooltip only — the backend-computed variance, verbatim.
      variance: point.variance,
    }));

  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      isLoading={isPending}
      isError={isError}
      isEmpty={rows.length === 0}
      emptyTitle={t("empty.title")}
      emptyDescription={t("empty.description")}
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
                labelFormatter={(label, payload) => {
                  const variance = payload?.[0]?.payload?.variance;
                  return (
                    <div className="grid gap-0.5">
                      <span className="font-medium">
                        {formatSeriesMonthLabel(String(label))}
                      </span>
                      {variance ? (
                        <span className="text-muted-foreground">
                          {t("variance")}: {formatPlotMoney(variance.amount)} ·{" "}
                          {t("varianceHint")}
                        </span>
                      ) : null}
                    </div>
                  );
                }}
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
          <Line
            dataKey="planned"
            type="monotone"
            stroke="var(--color-planned)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            dataKey="actual"
            type="monotone"
            stroke="var(--color-actual)"
            strokeWidth={2}
            dot={false}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}
