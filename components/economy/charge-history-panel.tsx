"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon, MoveRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { toast } from "sonner";

import type { SubscriptionResponse } from "@/api/generated";
import {
  getEconomySubscriptionChargeHistoryOptions,
  unlinkEconomySubscriptionTransactionMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import { zLinkTransactionRequest } from "@/api/generated/zod.gen";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { LinkCandidatesSkeleton } from "@/components/economy/economy-skeletons";
import { LinkTransactionDialog } from "@/components/economy/link-transaction-dialog";
import { Money } from "@/components/economy/money";
import { invalidateAfterLinkChange } from "@/components/economy/subscription-invalidation";
import { Button } from "@/components/ui/button";
import { formatEconomyDate } from "@/lib/economy/period";
import { subscriptionBoardParsers } from "@/lib/economy/subscription-filters";
import { useHousehold } from "@/lib/household-context";

/**
 * Charge history for one subscription, expanded inside its board card. Rows
 * are **actuals only** (linked transactions — `transactionId` is non-null by
 * contract); predictions live in the calendars, suggestions in the link
 * dialog. Paging state lives in the URL (`?chargePage=`/`?chargePageSize=`)
 * so it survives refresh; the backend clamps silently and the **echoed**
 * `page`/`pageSize`/`total` are what pagination renders from, never the
 * request params. Price changes are backend-derived — rendered as-is, no
 * diffing.
 */
export function ChargeHistoryPanel({
  subscription,
}: {
  subscription: SubscriptionResponse;
}) {
  const t = useTranslations("economy.subscriptions.history");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [linkOpen, setLinkOpen] = useState(false);
  const [{ chargePage, chargePageSize }, setBoardState] = useQueryStates(
    subscriptionBoardParsers,
  );

  const historyQuery = useQuery(
    getEconomySubscriptionChargeHistoryOptions({
      path: { subscriptionId: subscription.subscriptionId },
      query: { householdId, page: chargePage, pageSize: chargePageSize },
    }),
  );
  const history = historyQuery.data;

  const unlinkMutation = useMutation({
    ...unlinkEconomySubscriptionTransactionMutation(),
    onSuccess: async () => {
      await invalidateAfterLinkChange(
        queryClient,
        householdId,
        subscription.subscriptionId,
      );
      toast.success(t("unlinked"));
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  const unlink = (transactionId: string) => {
    const parsed = zLinkTransactionRequest.safeParse({
      householdId,
      transactionId,
    });
    if (!parsed.success) return;
    void unlinkMutation.mutateAsync({
      path: { subscriptionId: subscription.subscriptionId },
      body: parsed.data,
    });
  };

  // The echoed values are authoritative — the server clamps the request
  // params silently. Coerce with Number() for display/page-count only.
  const effectivePage = Number(history?.page ?? chargePage);
  const effectivePageSize = Number(history?.pageSize ?? chargePageSize);
  const total = Number(history?.total ?? 0);
  const pageCount = Math.max(
    1,
    Math.ceil(total / Math.max(1, effectivePageSize)),
  );

  return (
    <div className="grid gap-3 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-muted-foreground">
          {t("title")}
        </h4>
        <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
          {t("linkCharge")}
        </Button>
      </div>

      <LinkTransactionDialog
        subscription={subscription}
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
      />

      {historyQuery.isLoading ? (
        <LinkCandidatesSkeleton />
      ) : !history ? null : (
        <>
          {history.priceChanges.length > 0 ? (
            <ul className="grid gap-1">
              {history.priceChanges.map((change) => (
                <li
                  key={change.changedOn}
                  className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span>{t("priceChange")}</span>
                  <Money value={change.previousAmount} />
                  <MoveRightIcon aria-hidden className="size-3" />
                  <Money value={change.newAmount} className="font-medium" />
                  <span>({formatEconomyDate(change.changedOn)})</span>
                </li>
              ))}
            </ul>
          ) : null}

          {history.charges.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="grid gap-2">
              {history.charges.map((charge) => (
                <li
                  key={charge.transactionId}
                  className="flex items-center justify-between gap-3 border px-3 py-2"
                >
                  <div className="grid min-w-0 gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatEconomyDate(charge.occurredOn)}
                    </span>
                    {charge.note ? (
                      <span className="truncate text-sm">{charge.note}</span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Money
                      value={charge.amount}
                      className="text-sm font-medium"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={unlinkMutation.isPending}
                      onClick={() => unlink(charge.transactionId)}
                    >
                      {t("unlink")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pageCount > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={t("previousPage")}
                disabled={effectivePage <= 1}
                onClick={() =>
                  void setBoardState({ chargePage: effectivePage - 1 })
                }
              >
                <ChevronLeftIcon />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {t("pageOf", { page: effectivePage, pageCount })}
              </span>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={t("nextPage")}
                disabled={effectivePage >= pageCount}
                onClick={() =>
                  void setBoardState({ chargePage: effectivePage + 1 })
                }
              >
                <ChevronRightIcon />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
