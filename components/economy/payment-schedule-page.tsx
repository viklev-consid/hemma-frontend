"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";

import { getEconomySubscriptionPaymentScheduleOptions } from "@/api/generated/@tanstack/react-query.gen";
import { PaymentScheduleSkeleton } from "@/components/economy/economy-skeletons";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  currentYear,
  formatMonthNumber,
  isValidScheduleYear,
} from "@/lib/economy/subscription-calendar";
import { parseAsScheduleYear } from "@/lib/economy/subscription-filters";
import { useHousehold } from "@/lib/household-context";
import { cn } from "@/lib/utils";

const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Year payment calendar — one row per subscription, 12 month cells, filled
 * where the backend says a charge is expected. **Predictions only** (excludes
 * cancelled), and the backend computes which months: the FE never projects
 * cadence into months itself. `?year=` lives in the URL so it survives
 * refresh/share. Horizontally scrollable on phones.
 */
export function PaymentSchedulePage() {
  const t = useTranslations("economy.subscriptions.schedule");
  const { householdId } = useHousehold();
  const [year, setYear] = useQueryState(
    "year",
    parseAsScheduleYear.withDefault(currentYear()),
  );

  const { data: scheduleData, isLoading } = useQuery(
    getEconomySubscriptionPaymentScheduleOptions({
      query: { householdId, year },
    }),
  );
  const rows = scheduleData?.subscriptions ?? [];

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t("previousYear")}
            disabled={!isValidScheduleYear(year - 1)}
            onClick={() => void setYear(year - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-12 text-center text-sm font-medium tabular-nums">
            {year}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t("nextYear")}
            disabled={!isValidScheduleYear(year + 1)}
            onClick={() => void setYear(year + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </header>

      {isLoading ? (
        <PaymentScheduleSkeleton />
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sr-only">{t("nameColumn")}</th>
                {MONTH_NUMBERS.map((month) => (
                  <th
                    key={month}
                    scope="col"
                    className="px-1.5 pb-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {formatMonthNumber(month)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                // Coerce once per row: months arrive as `number | string`.
                const chargedMonths = new Set(row.months.map(Number));
                return (
                  <tr key={row.subscriptionId}>
                    <th
                      scope="row"
                      className="max-w-40 truncate py-1.5 pr-3 text-left text-sm font-medium"
                    >
                      {row.name}
                    </th>
                    {MONTH_NUMBERS.map((month) => {
                      const charged = chargedMonths.has(month);
                      return (
                        <td key={month} className="px-1.5 py-1.5">
                          <div
                            aria-hidden
                            className={cn(
                              "mx-auto size-6 rounded-sm border",
                              charged
                                ? "border-primary bg-primary/80"
                                : "border-border bg-muted/40",
                            )}
                          />
                          <span className="sr-only">
                            {charged
                              ? t("cell.expected", {
                                  month: formatMonthNumber(month),
                                })
                              : t("cell.none", {
                                  month: formatMonthNumber(month),
                                })}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
