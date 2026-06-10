"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";

import type { MonthChargeResponse } from "@/api/generated";
import { getEconomySubscriptionMonthCalendarOptions } from "@/api/generated/@tanstack/react-query.gen";
import { MonthCalendarSkeleton } from "@/components/economy/economy-skeletons";
import { Money } from "@/components/economy/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { todayAnchorDate } from "@/lib/economy/anchor-date";
import { parseAsAnchorDate } from "@/lib/economy/nuqs-parsers";
import { formatEconomyDate } from "@/lib/economy/period";
import { SUBSCRIPTION_MATCH_STATE } from "@/lib/economy/subscription";
import {
  addMonthsAnchor,
  formatMonthHeading,
} from "@/lib/economy/subscription-calendar";
import { useHousehold } from "@/lib/household-context";

/**
 * Month charge calendar. Renders **only** what the backend's `days[]` says —
 * actuals sit on the transaction's real date (not the scheduled charge day),
 * a linked actual replaces that month's prediction, and cancelled-subscription
 * actuals still appear (real money is never dropped). No client-side day math
 * or gap filling. Totals are backend-summed (`actualTotal`/`predictedTotal`)
 * and deliberately never combined — real spend stays separate from forecast.
 * `?month=` is a full ISO anchor date inside the target month.
 */
export function MonthCalendarPage() {
  const t = useTranslations("economy.subscriptions.month");
  const { householdId } = useHousehold();
  const [month, setMonth] = useQueryState(
    "month",
    parseAsAnchorDate.withDefault(todayAnchorDate()),
  );

  const calendarQuery = useQuery(
    getEconomySubscriptionMonthCalendarOptions({
      query: { householdId, month },
    }),
  );
  const calendar = calendarQuery.data;
  const days = calendar?.days ?? [];

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
            aria-label={t("previousMonth")}
            onClick={() => void setMonth(addMonthsAnchor(month, -1))}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-28 text-center text-sm font-medium">
            {formatMonthHeading(month)}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t("nextMonth")}
            onClick={() => void setMonth(addMonthsAnchor(month, 1))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </header>

      {calendarQuery.isLoading || !calendar ? (
        <MonthCalendarSkeleton />
      ) : (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="grid gap-0.5">
              <span className="text-xs text-muted-foreground">
                {t("totals.actual")}
              </span>
              <Money
                value={calendar.actualTotal}
                className="text-sm font-semibold"
              />
            </div>
            <div className="grid gap-0.5">
              <span className="text-xs text-muted-foreground">
                {t("totals.predicted")}
              </span>
              <Money
                value={calendar.predictedTotal}
                className="text-sm font-semibold text-muted-foreground"
              />
            </div>
          </div>

          {days.length === 0 ? (
            <Empty>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </Empty>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {days.map((day) => (
                <li
                  key={day.date}
                  className="grid content-start gap-2 border p-3"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatEconomyDate(day.date)}
                  </span>
                  <ul className="grid gap-1.5">
                    {day.charges.map((charge) => (
                      <ChargeChip
                        key={`${charge.subscriptionId}:${charge.transactionId ?? "predicted"}`}
                        charge={charge}
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * `actual` charges are solid (a linked, real transaction); `predicted` are
 * muted outlines explicitly labeled as forecasts. Match states are lowercase
 * in the contract.
 */
function ChargeChip({ charge }: { charge: MonthChargeResponse }) {
  const t = useTranslations("economy.subscriptions.month");
  const isActual = charge.matchState === SUBSCRIPTION_MATCH_STATE.actual;

  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-xs">{charge.name}</span>
        <Badge variant={isActual ? "secondary" : "outline"}>
          {isActual ? t("chip.actual") : t("chip.predicted")}
        </Badge>
      </div>
      <Money
        value={charge.amount}
        className={
          isActual
            ? "text-xs font-medium"
            : "text-xs font-medium text-muted-foreground"
        }
      />
    </li>
  );
}
