"use client";

import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  analyticsRangeForMonths,
  defaultAnalyticsRange,
} from "@/lib/economy/analytics";
import { analyticsRangeParsers } from "@/lib/economy/analytics-filters";

import { CategoryTrendChart } from "./category-trend-chart";
import { IncomeExpenseChart } from "./income-expense-chart";
import { PeriodComparisonCard } from "./period-comparison-card";
import { SpendBreakdownChart } from "./spend-breakdown-chart";
import { TopTransactionsCard } from "./top-transactions-card";
import { VarianceHistoryChart } from "./variance-history-chart";

const RANGE_PRESETS = [3, 6, 12] as const;

/**
 * Insights — six display-only analytics surfaces over a shared date range.
 *
 * `?from=`/`?to=` (shared range) live here; `?category=` (top-transactions) and
 * `?anchor=` (period-comparison) are owned by their own cards. Everything is
 * read-only: no mutations, no invalidation. Each card runs its own query and
 * renders its own skeleton / empty / error state, so one sparse surface never
 * blanks the page. Charts are client-only (Recharts); the prefetched cache for
 * the default range hydrates first paint.
 */
export function AnalyticsPage() {
  const t = useTranslations("economy.analytics");
  const defaults = defaultAnalyticsRange();

  const [{ from, to }, setRange] = useQueryStates({
    from: analyticsRangeParsers.from.withDefault(defaults.from),
    to: analyticsRangeParsers.to.withDefault(defaults.to),
  });

  // Highlight the preset whose computed bounds match the current range.
  const activePreset = RANGE_PRESETS.find((months) => {
    const preset = analyticsRangeForMonths(months);
    return preset.from === from && preset.to === to;
  });

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <fieldset className="flex flex-wrap items-center gap-1">
          <legend className="sr-only">{t("range.label")}</legend>
          {RANGE_PRESETS.map((months) => (
            <Button
              key={months}
              size="sm"
              variant={activePreset === months ? "secondary" : "ghost"}
              aria-pressed={activePreset === months}
              onClick={() => void setRange(analyticsRangeForMonths(months))}
            >
              {t(`range.presets.${months}`)}
            </Button>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="analytics-from" className="text-xs">
              {t("range.from")}
            </Label>
            <Input
              id="analytics-from"
              type="date"
              value={from}
              max={to}
              className="w-40"
              onChange={(event) => {
                const value = event.target.value;
                if (value) void setRange({ from: value });
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="analytics-to" className="text-xs">
              {t("range.to")}
            </Label>
            <Input
              id="analytics-to"
              type="date"
              value={to}
              min={from}
              className="w-40"
              onChange={(event) => {
                const value = event.target.value;
                if (value) void setRange({ to: value });
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryTrendChart from={from} to={to} />
        <SpendBreakdownChart from={from} to={to} />
        <IncomeExpenseChart from={from} to={to} />
        <VarianceHistoryChart from={from} to={to} />
        <PeriodComparisonCard />
        <TopTransactionsCard from={from} to={to} />
      </div>
    </div>
  );
}
