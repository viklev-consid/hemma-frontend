"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState, useQueryStates } from "nuqs";

import {
  listEconomyCategoriesOptions,
  listEconomyTransactionsInfiniteOptions,
  listHouseholdMembersOptions,
  searchEconomyTransactionNotesOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import type { TransactionResponse } from "@/api/generated";
import { AttachReceiptButton } from "@/components/economy/attach-receipt-button";
import { TransactionListSkeleton } from "@/components/economy/economy-skeletons";
import { Money } from "@/components/economy/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { flattenCategories } from "@/lib/economy/category-tree";
import { resolvePayerName } from "@/lib/economy/payer";
import { formatEconomyDate } from "@/lib/economy/period";
import {
  DEFAULT_TRANSACTION_PAGE_SIZE,
  transactionFilterParsers,
  transactionSearchParser,
} from "@/lib/economy/transaction-filters";
import { useHousehold } from "@/lib/household-context";

const ALL = "__all__";

/**
 * Transaction list — the daily-driver surface. Structured filters live in the
 * URL (survive refresh/share) and drive `listEconomyTransactions` (infinite,
 * mobile-first). A non-empty note search swaps the source to
 * `searchEconomyTransactionNotes` (a separate endpoint). Membership-gated.
 */
export function TransactionsListPage({ slug }: { slug: string }) {
  const t = useTranslations("economy.transactions");
  const { householdId } = useHousehold();

  const [search, setSearch] = useQueryState(
    "search",
    transactionSearchParser.search,
  );
  const [filters, setFilters] = useQueryStates(transactionFilterParsers);
  const isSearching = search.trim().length > 0;

  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );
  const membersQuery = useQuery(
    listHouseholdMembersOptions({ path: { householdRef: slug } }),
  );

  const flatCategories = useMemo(
    () => flattenCategories(categoriesQuery.data?.categories ?? []),
    [categoriesQuery.data],
  );
  const categoryName = useMemo(
    () =>
      new Map(
        flatCategories.map((f) => [f.category.categoryId, f.category.name]),
      ),
    [flatCategories],
  );
  const members = membersQuery.data?.members ?? [];

  const listQuery = {
    householdId,
    pageSize: DEFAULT_TRANSACTION_PAGE_SIZE,
    categoryId: filters.categoryId ?? undefined,
    from: filters.from ?? undefined,
    to: filters.to ?? undefined,
    payerId: filters.payerId ?? undefined,
    hasReceipt: filters.hasReceipt ?? undefined,
    minAmount: filters.minAmount ?? undefined,
    maxAmount: filters.maxAmount ?? undefined,
  };

  const infinite = useInfiniteQuery({
    ...listEconomyTransactionsInfiniteOptions({ query: listQuery }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Pagination math on counts (not money): advance while more remain.
      const page = Number(lastPage.page);
      const size = Number(lastPage.pageSize);
      const total = Number(lastPage.totalCount);
      return page * size < total ? page + 1 : undefined;
    },
    enabled: !isSearching,
  });

  const searchQuery = useQuery({
    ...searchEconomyTransactionNotesOptions({
      query: {
        householdId,
        search: search.trim(),
        pageSize: DEFAULT_TRANSACTION_PAGE_SIZE,
      },
    }),
    enabled: isSearching,
  });

  const transactions: TransactionResponse[] = isSearching
    ? (searchQuery.data?.transactions ?? [])
    : (infinite.data?.pages.flatMap((page) => page.transactions) ?? []);

  const isLoading = isSearching ? searchQuery.isLoading : infinite.isLoading;

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          size="sm"
          render={<Link href={`/app/h/${slug}/economy/transactions/new`} />}
        >
          <PlusIcon />
          {t("record.trigger")}
        </Button>
      </header>

      <Input
        type="search"
        value={search}
        placeholder={t("list.searchPlaceholder")}
        onChange={(event) => void setSearch(event.target.value)}
      />

      {/* Filters apply to the list view; hidden while a note search is active. */}
      {isSearching ? null : (
        <div className="grid gap-3 border p-3 sm:grid-cols-2 lg:grid-cols-3">
          <FilterField label={t("list.filters.category")}>
            <Select
              value={filters.categoryId ?? ALL}
              onValueChange={(value) =>
                void setFilters({ categoryId: value === ALL ? null : value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("list.filters.all")}</SelectItem>
                {flatCategories.map(({ category, depth }) => (
                  <SelectItem
                    key={category.categoryId}
                    value={category.categoryId}
                  >
                    {`${"  ".repeat(depth)}${category.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label={t("list.filters.payer")}>
            <Select
              value={filters.payerId ?? ALL}
              onValueChange={(value) =>
                void setFilters({ payerId: value === ALL ? null : value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("list.filters.all")}</SelectItem>
                {members
                  .filter((member) => !member.isAnonymized && member.userId)
                  .map((member) => (
                    <SelectItem
                      key={member.userId as string}
                      value={member.userId as string}
                    >
                      {member.displayName ?? (member.userId as string)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label={t("list.filters.from")}>
            <Input
              type="date"
              value={filters.from ?? ""}
              onChange={(event) =>
                void setFilters({ from: event.target.value || null })
              }
            />
          </FilterField>

          <FilterField label={t("list.filters.to")}>
            <Input
              type="date"
              value={filters.to ?? ""}
              onChange={(event) =>
                void setFilters({ to: event.target.value || null })
              }
            />
          </FilterField>

          <FilterField label={t("list.filters.minAmount")}>
            <Input
              inputMode="decimal"
              value={filters.minAmount ?? ""}
              onChange={(event) =>
                void setFilters({ minAmount: event.target.value || null })
              }
            />
          </FilterField>

          <FilterField label={t("list.filters.maxAmount")}>
            <Input
              inputMode="decimal"
              value={filters.maxAmount ?? ""}
              onChange={(event) =>
                void setFilters({ maxAmount: event.target.value || null })
              }
            />
          </FilterField>

          <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-3">
            <Label className="gap-2">
              <Switch
                checked={filters.hasReceipt === true}
                onCheckedChange={(checked) =>
                  void setFilters({ hasReceipt: checked ? true : null })
                }
              />
              {t("list.filters.hasReceipt")}
            </Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void setFilters(null);
              }}
            >
              {t("list.filters.clear")}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <TransactionListSkeleton />
      ) : transactions.length === 0 ? (
        <Empty>
          <EmptyTitle>
            {isSearching ? t("list.searchEmpty.title") : t("list.empty.title")}
          </EmptyTitle>
          <EmptyDescription>
            {isSearching
              ? t("list.searchEmpty.description")
              : t("list.empty.description")}
          </EmptyDescription>
        </Empty>
      ) : (
        <>
          <ul className="grid gap-2">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.transactionId}
                tx={tx}
                categoryLabel={
                  tx.categoryId
                    ? (categoryName.get(tx.categoryId) ??
                      t("list.uncategorized"))
                    : t("list.uncategorized")
                }
                payerLabel={resolvePayerName(
                  members,
                  tx.payerId,
                  t("list.unknownPayer"),
                )}
              />
            ))}
          </ul>
          {!isSearching && infinite.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={infinite.isFetchingNextPage}
                onClick={() => void infinite.fetchNextPage()}
              >
                {t("list.loadMore")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function TransactionRow({
  tx,
  categoryLabel,
  payerLabel,
}: {
  tx: TransactionResponse;
  categoryLabel: string;
  payerLabel: string | null;
}) {
  const t = useTranslations("economy.transactions");
  return (
    <li className="flex items-center justify-between gap-4 border px-3 py-2.5">
      <div className="grid min-w-0 gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{categoryLabel}</span>
          {tx.isPending ? (
            <Badge variant="secondary">{t("list.pending")}</Badge>
          ) : null}
          {tx.subscriptionId !== null ? (
            <Badge variant="outline">{t("list.subscriptionLinked")}</Badge>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatEconomyDate(tx.occurredOn)}
          {payerLabel ? ` · ${payerLabel}` : ""}
          {tx.note ? ` · ${tx.note}` : ""}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {tx.hasReceipt ? (
          <Badge variant="secondary">{t("list.receipt.has")}</Badge>
        ) : (
          <AttachReceiptButton transactionId={tx.transactionId} />
        )}
        <Money value={tx.amount} className="text-sm font-medium" />
      </div>
    </li>
  );
}
