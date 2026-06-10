"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis } from "recharts";

import { getEconomyIncomeVsExpenseOptions } from "@/api/generated/@tanstack/react-query.gen";
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
 * Income vs. expense — grouped bars (income / expense) per calendar month with
 * a net line over the top. All three values come straight off
 * `IncomeVsExpensePointResponse`; `toPlotValue` only supplies y-coordinates.
 * Months without transactions are simply absent (no zero-fill). Calendar-month
 * bucketing regardless of `cycleStartDay`.
 */
export function IncomeExpenseChart({ from, to }: { from: string; to: string }) {
  const t = useTranslations("economy.analytics.incomeExpense");
  const { householdId } = useHousehold();

  const { data, isPending, isError } = useQuery(
    getEconomyIncomeVsExpenseOptions({ query: { householdId, from, to } }),
  );

  const config = {
    income: { label: t("income"), color: "var(--chart-1)" },
    expense: { label: t("expense"), color: "var(--chart-2)" },
    net: { label: t("net"), color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const rows = [...(data?.series ?? [])]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((point) => ({
      label: point.label,
      income: toPlotValue(point.income),
      expense: toPlotValue(point.expense),
      net: toPlotValue(point.net),
    }));

  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      isLoading={isPending}
      isError={isError}
      isEmpty={rows.length === 0}
    >
      <ChartContainer config={config}>
        <ComposedChart accessibilityLayer data={rows}>
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
          <Bar dataKey="income" fill="var(--color-income)" radius={2} />
          <Bar dataKey="expense" fill="var(--color-expense)" radius={2} />
          <Line
            dataKey="net"
            type="monotone"
            stroke="var(--color-net)"
            strokeWidth={2}
            dot={false}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </ComposedChart>
      </ChartContainer>
    </ChartCard>
  );
}
