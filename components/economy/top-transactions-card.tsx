"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";

import {
  getEconomyTopTransactionsOptions,
  listEconomyCategoriesOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_TOP_LIMIT } from "@/lib/economy/analytics";
import { topTransactionsParsers } from "@/lib/economy/analytics-filters";
import { flattenCategories } from "@/lib/economy/category-tree";
import { formatEconomyDate } from "@/lib/economy/period";
import { useHousehold } from "@/lib/household-context";

import { ChartCard } from "./analytics-card";
import { RankedListSkeleton } from "./economy-skeletons";
import { Money } from "./money";

// Sentinel for the "all categories" option — Select disallows an empty value.
const ALL_CATEGORIES = "all";

/**
 * Top transactions — the biggest amounts in range, ranked desc across all kinds
 * (Income included by contract — resolved-Q #6). A list, not a chart. Always
 * sends an explicit `limit` (the backend has no upper clamp and no reliable
 * default). `?category=` filters server-side via `categoryId`; the category
 * options come from the shell-cached `listEconomyCategories`.
 */
export function TopTransactionsCard({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const t = useTranslations("economy.analytics.topTransactions");
  const { householdId } = useHousehold();

  const [category, setCategory] = useQueryState(
    "category",
    topTransactionsParsers.category,
  );

  const { data, isPending, isError } = useQuery(
    getEconomyTopTransactionsOptions({
      query: {
        householdId,
        from,
        to,
        limit: DEFAULT_TOP_LIMIT,
        ...(category ? { categoryId: category } : {}),
      },
    }),
  );

  const { data: categoriesData } = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );
  const flatCategories = flattenCategories(categoriesData?.categories ?? []);

  const transactions = data?.transactions ?? [];

  const filter = (
    <Select
      value={category ?? ALL_CATEGORIES}
      onValueChange={(value) =>
        void setCategory(value === ALL_CATEGORIES ? null : value)
      }
    >
      <SelectTrigger size="sm" aria-label={t("filterLabel")} className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_CATEGORIES}>{t("allCategories")}</SelectItem>
        {flatCategories.map(({ category: cat }) => (
          <SelectItem key={cat.categoryId} value={cat.categoryId}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      isLoading={isPending}
      isError={isError}
      isEmpty={transactions.length === 0}
      emptyTitle={t("empty.title")}
      emptyDescription={t("empty.description")}
      action={filter}
      loadingSlot={<RankedListSkeleton />}
    >
      <ol className="grid gap-1.5">
        {transactions.map((tx, index) => (
          <li
            key={tx.transactionId}
            className="flex items-center justify-between gap-3 border px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="grid min-w-0 gap-0.5">
                <span className="flex items-center gap-2 truncate text-sm">
                  {tx.categoryName ?? t("uncategorized")}
                  <Badge variant="secondary" className="shrink-0">
                    {t(`kind.${tx.kind}`)}
                  </Badge>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {formatEconomyDate(tx.occurredOn)}
                  {tx.note ? ` · ${tx.note}` : ""}
                </span>
              </div>
            </div>
            <Money value={tx.amount} className="shrink-0 text-sm font-medium" />
          </li>
        ))}
      </ol>
    </ChartCard>
  );
}
