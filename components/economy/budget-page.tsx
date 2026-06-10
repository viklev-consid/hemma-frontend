"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { toast } from "sonner";

import {
  copyEconomyBudgetFromPreviousPeriodMutation,
  getEconomyBudgetSummaryOptions,
  getEconomyBudgetSummaryQueryKey,
  listEconomyCategoriesOptions,
  upsertEconomyBudgetLineMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import { createEconomyBudget } from "@/api/generated";
import type {
  BudgetResponse,
  BudgetSummaryLineResponse,
  CategoryResponse,
} from "@/api/generated";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { EconomyBudgetSkeleton } from "@/components/economy/economy-skeletons";
import { Money, MoneyInput } from "@/components/economy/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { formatBudgetPercent } from "@/lib/economy/budget-percent";
import { flattenCategories } from "@/lib/economy/category-tree";
import {
  isValidMoneyAmount,
  normalizeMoneyAmount,
  toMoneyRequest,
} from "@/lib/economy/money";
import { addDays, formatPeriodRange } from "@/lib/economy/period";
import { parseAsAnchorDate, todayAnchorDate } from "@/lib/economy/nuqs-parsers";
import { useHousehold } from "@/lib/household-context";

/**
 * Budget editor + overview. The selected period lives in `?period=` (an
 * `anchorDate`); the backend resolves the containing period — the browser does
 * no period math. Prev/next step one day outside the backend-returned
 * boundaries to land an anchor in the adjacent period.
 *
 * Budgetable categories are editable (planned amount → `upsertEconomyBudgetLine`);
 * non-budgetable categories are tracked, read-only. "Copy from previous period"
 * may yield an empty budget — that's a valid editable state, not an error.
 * Membership-gated. SEK-only via `MoneyInput`.
 */
export function BudgetPage() {
  const t = useTranslations("economy.budget");
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  const [anchorDate, setAnchorDate] = useQueryState(
    "period",
    parseAsAnchorDate.withDefault(todayAnchorDate()),
  );

  const {
    data: ensuredBudget,
    isError: isEnsureBudgetError,
    isPending: isEnsuringBudget,
    isSuccess: hasEnsuredBudget,
  } = useQuery({
    queryKey: ["economy-budget", "ensure", householdId, anchorDate],
    queryFn: async (): Promise<BudgetResponse> => {
      const { data } = await createEconomyBudget({
        body: { householdId, anchorDate },
        throwOnError: true,
      });

      if (!data) {
        throw new Error("Budget ensure returned no data");
      }

      return data;
    },
  });
  const {
    data: summary,
    isError: isSummaryError,
    isPending: isSummaryPending,
  } = useQuery({
    ...getEconomyBudgetSummaryOptions({ query: { householdId, anchorDate } }),
    enabled: hasEnsuredBudget,
  });
  const { data: categoriesData, isPending: isCategoriesPending } = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );

  const summaryKey = getEconomyBudgetSummaryQueryKey({
    query: { householdId, anchorDate },
  });

  const copyMutation = useMutation({
    ...copyEconomyBudgetFromPreviousPeriodMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: summaryKey });
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  if (isEnsuringBudget || isSummaryPending || isCategoriesPending) {
    return <EconomyBudgetSkeleton />;
  }

  if (isEnsureBudgetError || isSummaryError || !ensuredBudget) {
    return (
      <div className="grid min-h-[30vh] place-items-center text-center">
        <div className="grid gap-1">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("emptyPeriod.description")}
          </p>
        </div>
      </div>
    );
  }

  const budgetId = summary?.budgetId ?? ensuredBudget.budgetId;
  const lineByCategory = new Map<string, BudgetSummaryLineResponse>(
    (summary?.lines ?? []).map((line) => [line.categoryId, line]),
  );
  const flat = flattenCategories(categoriesData?.categories ?? []);
  const hasNoLines = (summary?.lines.length ?? 0) === 0;

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="previous-period"
            disabled={!summary}
            onClick={() =>
              summary && void setAnchorDate(addDays(summary.periodStartsOn, -1))
            }
          >
            <ChevronLeftIcon />
          </Button>
          <span className="text-sm font-medium">
            {summary
              ? formatPeriodRange(summary.periodStartsOn, summary.periodEndsOn)
              : null}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="next-period"
            disabled={!summary}
            onClick={() =>
              summary && void setAnchorDate(addDays(summary.periodEndsOn, 1))
            }
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!budgetId || copyMutation.isPending}
          onClick={() =>
            copyMutation.mutate({ body: { householdId, anchorDate } })
          }
        >
          <CopyIcon />
          {copyMutation.isPending ? t("copying") : t("copyFromPrevious")}
        </Button>
      </div>

      {summary ? (
        <p className="text-xs text-muted-foreground">
          {t("pace.elapsed", {
            elapsed: formatBudgetPercent(summary.elapsedPercent),
          })}
        </p>
      ) : null}

      {flat.length === 0 ? (
        <Empty>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </Empty>
      ) : (
        <>
          {hasNoLines ? (
            <div className="border border-dashed p-3 text-xs text-muted-foreground">
              {t("emptyPeriod.description")}
            </div>
          ) : null}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">{t("columns.category")}</th>
                <th className="py-2 text-right font-medium">
                  {t("columns.planned")}
                </th>
                <th className="py-2 text-right font-medium">
                  {t("columns.actual")}
                </th>
              </tr>
            </thead>
            <tbody>
              {flat.map(({ category, depth }) =>
                category.budgetable && budgetId ? (
                  <BudgetLineRow
                    key={category.categoryId}
                    budgetId={budgetId}
                    anchorDate={anchorDate}
                    category={category}
                    depth={depth}
                    line={lineByCategory.get(category.categoryId)}
                  />
                ) : (
                  <TrackedRow
                    key={category.categoryId}
                    category={category}
                    depth={depth}
                    line={lineByCategory.get(category.categoryId)}
                  />
                ),
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function CategoryName({ name, depth }: { name: string; depth: number }) {
  return (
    <span style={{ paddingLeft: `${depth * 1.25}rem` }} className="text-sm">
      {name}
    </span>
  );
}

function BudgetLineRow({
  budgetId,
  anchorDate,
  category,
  depth,
  line,
}: {
  budgetId: string;
  anchorDate: string;
  category: CategoryResponse;
  depth: number;
  line: BudgetSummaryLineResponse | undefined;
}) {
  const t = useTranslations("economy.budget");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();

  const plannedAmount = line?.planned.amount ?? "0";
  // `draft` is null until the user edits — so we never seed state from props.
  // Render the draft if present, otherwise the server value; reset to null on
  // save so the freshly-invalidated server value shows through.
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? plannedAmount;

  const upsert = useMutation({
    ...upsertEconomyBudgetLineMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getEconomyBudgetSummaryQueryKey({
          query: { householdId, anchorDate },
        }),
      });
      setDraft(null);
      toast.success(t("saved"));
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  const valid = isValidMoneyAmount(value);
  const dirty =
    draft !== null &&
    normalizeMoneyAmount(value) !== normalizeMoneyAmount(plannedAmount);

  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2">
        <CategoryName name={category.name} depth={depth} />
      </td>
      <td className="py-2">
        <div className="flex items-center justify-end gap-2">
          <MoneyInput
            value={value}
            onValueChange={setDraft}
            aria-invalid={!valid}
            aria-label={category.name}
            className="w-28 text-right"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!dirty || !valid || upsert.isPending}
            onClick={() =>
              upsert.mutate({
                body: {
                  householdId,
                  budgetId,
                  categoryId: category.categoryId,
                  amount: toMoneyRequest(value),
                },
              })
            }
          >
            {upsert.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </td>
      <td className="py-2 text-right">
        {line ? (
          <div className="grid justify-items-end gap-0.5">
            <Money value={line.actual} />
            <span className="flex items-center gap-1.5">
              <span
                className={
                  line.isOverPace
                    ? "text-xs font-medium text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {t("pace.spent", {
                  spent: formatBudgetPercent(line.pacePercent),
                })}
              </span>
              {line.isOverPace ? (
                <Badge variant="destructive">{t("pace.overPace")}</Badge>
              ) : null}
            </span>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

function TrackedRow({
  category,
  depth,
  line,
}: {
  category: CategoryResponse;
  depth: number;
  line: BudgetSummaryLineResponse | undefined;
}) {
  const t = useTranslations("economy.budget");
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2">
        <CategoryName name={category.name} depth={depth} />
      </td>
      <td className="py-2 text-right">
        <Badge variant="secondary" className="ml-auto w-fit">
          {t("tracked")}
        </Badge>
      </td>
      <td className="py-2 text-right">
        {line ? <Money value={line.actual} /> : null}
      </td>
    </tr>
  );
}
