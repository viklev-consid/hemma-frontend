"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type {
  SubscriptionResponse,
  TransactionResponse,
} from "@/api/generated";
import {
  getEconomySubscriptionLinkCandidatesOptions,
  linkEconomySubscriptionTransactionMutation,
  listEconomyTransactionsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { zLinkTransactionRequest } from "@/api/generated/zod.gen";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { LinkCandidatesSkeleton } from "@/components/economy/economy-skeletons";
import { Money } from "@/components/economy/money";
import { invalidateAfterLinkChange } from "@/components/economy/subscription-invalidation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ECONOMY_ERRORS, isEconomyError } from "@/lib/economy/economy-errors";
import { formatEconomyDate } from "@/lib/economy/period";
import { useHousehold } from "@/lib/household-context";
import { cn } from "@/lib/utils";

const PICKER_PAGE_SIZE = 50;

type LinkTransactionDialogProps = {
  subscription: SubscriptionResponse;
  open: boolean;
  onClose: () => void;
};

/**
 * Link an existing transaction to a subscription — **candidates first**: the
 * backend's link-candidates (same matching heuristic as import suggestions:
 * name + date window + amount tolerance, unlinked only, 12-month lookback,
 * ≤10) each get a one-click Link. Only when the candidate list is empty does
 * the manual picker appear: recent transactions, narrowed to the
 * subscription's account when set (client-side — the list endpoint has no
 * account filter), with already-linked rows greyed as client-side double-link
 * prevention. The 409 `Economy.Transaction.AlreadyLinked` stays the backstop
 * for races: it gets a dedicated message (unlink-then-relink is the remedy)
 * ahead of the generic problem toast. Re-linking to the same subscription is
 * an idempotent 200, so double-clicks are safe. Linking moves no money.
 */
export function LinkTransactionDialog({
  subscription,
  open,
  onClose,
}: LinkTransactionDialogProps) {
  const t = useTranslations("economy.subscriptions.link");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { name: subscription.name })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <LinkTransactionBody subscription={subscription} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LinkTransactionBody({
  subscription,
  onClose,
}: {
  subscription: SubscriptionResponse;
  onClose: () => void;
}) {
  const t = useTranslations("economy.subscriptions.link");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();

  const candidatesQuery = useQuery(
    getEconomySubscriptionLinkCandidatesOptions({
      path: { subscriptionId: subscription.subscriptionId },
      query: { householdId },
    }),
  );
  const candidates = candidatesQuery.data?.candidates ?? [];
  const showPicker = candidatesQuery.isSuccess && candidates.length === 0;

  const recentQuery = useQuery({
    ...listEconomyTransactionsOptions({
      query: { householdId, pageSize: PICKER_PAGE_SIZE },
    }),
    enabled: showPicker,
  });

  const mutation = useMutation({
    ...linkEconomySubscriptionTransactionMutation(),
    onSuccess: async () => {
      await invalidateAfterLinkChange(
        queryClient,
        householdId,
        subscription.subscriptionId,
      );
      toast.success(t("linked"));
      onClose();
    },
    onError: (error) => {
      const problem = error as unknown as ProblemDetails;
      // Linked to a *different* subscription (same-sub relinks are idempotent
      // 200s and never land here). Dedicated message before the generic toast.
      if (isEconomyError(problem, ECONOMY_ERRORS.TransactionAlreadyLinked)) {
        toast.error(t("alreadyLinked"));
        return;
      }
      handleProblem(problem);
    },
  });

  const link = (transactionId: string) => {
    const parsed = zLinkTransactionRequest.safeParse({
      householdId,
      transactionId,
    });
    if (!parsed.success) return;
    void mutation.mutateAsync({
      path: { subscriptionId: subscription.subscriptionId },
      body: parsed.data,
    });
  };

  if (candidatesQuery.isLoading) {
    return <LinkCandidatesSkeleton />;
  }

  if (!showPicker) {
    return (
      <div className="grid gap-2">
        <p className="text-xs text-muted-foreground">{t("candidatesHint")}</p>
        <ul className="grid gap-2">
          {candidates.map((candidate) => (
            <li
              key={candidate.transactionId}
              className="flex items-center justify-between gap-3 border px-3 py-2.5"
            >
              <div className="grid min-w-0 gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {formatEconomyDate(candidate.occurredOn)}
                </span>
                {candidate.note ? (
                  <span className="truncate text-sm">{candidate.note}</span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Money
                  value={candidate.amount}
                  className="text-sm font-medium"
                />
                <Button
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => link(candidate.transactionId)}
                >
                  {t("linkAction")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Manual picker fallback — no heuristic matches.
  const transactions = (recentQuery.data?.transactions ?? []).filter(
    (transaction) =>
      subscription.accountId === null ||
      transaction.accountId === subscription.accountId,
  );

  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">{t("pickerHint")}</p>
      {recentQuery.isLoading ? (
        <LinkCandidatesSkeleton />
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("pickerEmpty")}</p>
      ) : (
        <ul className="grid max-h-80 gap-2 overflow-y-auto">
          {transactions.map((transaction) => (
            <PickerRow
              key={transaction.transactionId}
              transaction={transaction}
              ownSubscriptionId={subscription.subscriptionId}
              pending={mutation.isPending}
              onLink={link}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PickerRow({
  transaction,
  ownSubscriptionId,
  pending,
  onLink,
}: {
  transaction: TransactionResponse;
  ownSubscriptionId: string;
  pending: boolean;
  onLink: (transactionId: string) => void;
}) {
  const t = useTranslations("economy.subscriptions.link");
  // Grey anything already linked — including to this subscription (relinking
  // it would be a no-op 200). The 409 backstop covers races.
  const isLinked = transaction.subscriptionId !== null;
  const isLinkedHere = transaction.subscriptionId === ownSubscriptionId;

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 border px-3 py-2.5",
        isLinked && "opacity-50",
      )}
    >
      <div className="grid min-w-0 gap-0.5">
        <span className="text-xs text-muted-foreground">
          {formatEconomyDate(transaction.occurredOn)}
        </span>
        {transaction.note ? (
          <span className="truncate text-sm">{transaction.note}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Money value={transaction.amount} className="text-sm font-medium" />
        {isLinked ? (
          <Badge variant="outline">
            {isLinkedHere ? t("linkedHere") : t("linkedElsewhere")}
          </Badge>
        ) : (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => onLink(transaction.transactionId)}
          >
            {t("linkAction")}
          </Button>
        )}
      </div>
    </li>
  );
}
