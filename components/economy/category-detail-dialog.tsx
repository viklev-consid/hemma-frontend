"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  getEconomyCategoryTrendOptions,
  getEconomyVarianceHistoryOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatPlotMoney,
  formatSeriesMonthLabel,
  toPlotValue,
} from "@/lib/economy/analytics";
import { useHousehold } from "@/lib/household-context";

/** The category clicked from a chart — enough to title + query the drill-down. */
export type SelectedCategory = { categoryId: string; categoryName: string };

/**
 * Click-to-drill detail for a single category over the shared range. Opened by
 * clicking a category in the trend or breakdown; transient (not URL-persisted).
 *
 * Primary view is `variance-history?categoryId=` — planned vs. actual per budget
 * period, with the backend's `variance` (planned − actual; positive = under
 * budget) surfaced in the tooltip. If the category has no budget in range, the
 * series is empty (200) and we fall back to its **actual** spend from the
 * already-cached `category-trend` so a click never opens an empty dialog.
 */
export function CategoryDetailDialog({
  category,
  from,
  to,
  onOpenChange,
}: {
  category: SelectedCategory | null;
  from: string;
  to: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={category !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {category ? (
          <CategoryDetailBody
            key={category.categoryId}
            category={category}
            from={from}
            to={to}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CategoryDetailBody({
  category,
  from,
  to,
}: {
  category: SelectedCategory;
  from: string;
  to: string;
}) {
  const t = useTranslations("economy.analytics.categoryDetail");
  const { householdId } = useHousehold();

  const variance = useQuery(
    getEconomyVarianceHistoryOptions({
      query: { householdId, from, to, categoryId: category.categoryId },
    }),
  );
  // Cached from the page's category-trend query (same range) — the actual-only
  // fallback when the category isn't budgeted; no extra network in practice.
  const trend = useQuery(
    getEconomyCategoryTrendOptions({ query: { householdId, from, to } }),
  );

  const varianceRows = (variance.data?.series ?? [])
    .toSorted((a, b) => a.label.localeCompare(b.label))
    .map((point) => ({
      label: point.label,
      planned: toPlotValue(point.planned),
      actual: toPlotValue(point.actual),
      variance: point.variance,
    }));
  const budgeted = varianceRows.length > 0;

  const trendPoints =
    trend.data?.series.find((s) => s.categoryId === category.categoryId)
      ?.points ?? [];
  const actualRows = trendPoints
    .toSorted((a, b) => a.label.localeCompare(b.label))
    .map((point) => ({ label: point.label, actual: toPlotValue(point.value) }));

  const config = {
    planned: { label: t("planned"), color: "var(--chart-3)" },
    actual: { label: t("actual"), color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const isLoading = variance.isPending || trend.isPending;
  const isEmpty = !budgeted && actualRows.length === 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {t("title", { category: category.categoryName })}
        </DialogTitle>
        <DialogDescription>
          {budgeted ? t("budgetVsActual") : t("actualOnly")}
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <Skeleton className="aspect-video w-full" />
      ) : variance.isError ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          {t("empty.description")}
        </p>
      ) : isEmpty ? (
        <Empty className="border-0 py-8">
          <EmptyHeader>
            <EmptyTitle className="text-sm">{t("empty.title")}</EmptyTitle>
            <EmptyDescription className="text-xs">
              {t("empty.description")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-2">
          <ChartContainer config={config}>
            <LineChart
              accessibilityLayer
              data={budgeted ? varianceRows : actualRows}
            >
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
                      const v = payload?.[0]?.payload?.variance;
                      const amount = v ? Number(v.amount) : null;
                      return (
                        <div className="grid gap-0.5">
                          <span className="font-medium">
                            {formatSeriesMonthLabel(String(label))}
                          </span>
                          {v ? (
                            <span className="text-muted-foreground">
                              {t("variance")}: {formatPlotMoney(v.amount)} (
                              {amount !== null && amount < 0
                                ? t("overBudget")
                                : t("underBudget")}
                              )
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
              {budgeted ? (
                <Line
                  dataKey="planned"
                  type="monotone"
                  stroke="var(--color-planned)"
                  strokeWidth={2}
                  dot={false}
                />
              ) : null}
              <Line
                dataKey="actual"
                type="monotone"
                stroke="var(--color-actual)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
          <p className="text-center text-[11px] text-muted-foreground">
            {budgeted ? t("budgetPeriodNote") : t("actualOnly")}
          </p>
        </div>
      )}
    </>
  );
}
