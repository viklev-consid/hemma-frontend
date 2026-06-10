"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  confirmEconomyEstimatedBillMutation,
  getEconomyAccountBalancesQueryKey,
  listEconomyAccountsOptions,
  listEconomyCategoriesOptions,
  listEconomyRecurringBillsOptions,
  listEconomyRecurringBillsQueryKey,
  listEconomyTransactionsQueryKey,
  pauseEconomyRecurringBillOccurrenceMutation,
  resumeEconomyRecurringBillOccurrenceMutation,
  skipEconomyRecurringBillOccurrenceMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type {
  RecurringBillOccurrenceResponse,
  RecurringBillResponse,
} from "@/api/generated";
import { zConfirmEstimatedBillRequest } from "@/api/generated/zod.gen";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import {
  RecurringBillListSkeleton,
  RecurringInboxSkeleton,
} from "@/components/economy/economy-skeletons";
import { Money, MoneyInput } from "@/components/economy/money";
import { RecurringBillForm } from "@/components/economy/recurring-bill-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatCadence } from "@/lib/economy/cadence";
import { flattenCategories } from "@/lib/economy/category-tree";
import { isValidMoneyAmount, toMoneyRequest } from "@/lib/economy/money";
import { formatEconomyDate } from "@/lib/economy/period";
import {
  type ConfirmableOccurrence,
  OCCURRENCE_STATE,
  RECURRING_BILL_TYPE,
  confirmableOccurrences,
} from "@/lib/economy/recurring-bill";
import { useHousehold } from "@/lib/household-context";

/**
 * Recurring bills surface: a confirmation inbox (derived from the same list
 * query, shown only when non-empty) above the bills list. Both fixed and
 * estimated bills render here; estimated bills are visually distinct via a
 * badge. Membership-gated — both owner and member manage bills and confirm.
 */
export function RecurringBillsPage() {
  const t = useTranslations("economy.recurring");
  const { householdId } = useHousehold();
  const [createOpen, setCreateOpen] = useState(false);

  const billsQuery = useQuery(
    listEconomyRecurringBillsOptions({ query: { householdId } }),
  );
  const accountsQuery = useQuery(
    listEconomyAccountsOptions({ query: { householdId } }),
  );
  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );

  const bills = useMemo(
    () => billsQuery.data?.recurringBills ?? [],
    [billsQuery.data],
  );

  const accountName = useMemo(
    () =>
      new Map(
        (accountsQuery.data?.accounts ?? []).map((a) => [a.accountId, a.name]),
      ),
    [accountsQuery.data],
  );
  const categoryName = useMemo(
    () =>
      new Map(
        flattenCategories(categoriesQuery.data?.categories ?? []).map((f) => [
          f.category.categoryId,
          f.category.name,
        ]),
      ),
    [categoriesQuery.data],
  );

  const inbox = useMemo(() => confirmableOccurrences(bills), [bills]);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          {t("add")}
        </Button>
      </header>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("form.title")}</DialogTitle>
            <DialogDescription>{t("form.description")}</DialogDescription>
          </DialogHeader>
          <RecurringBillForm
            onCancel={() => setCreateOpen(false)}
            onSuccess={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {billsQuery.isLoading ? (
        <div className="grid gap-6">
          <RecurringInboxSkeleton />
          <RecurringBillListSkeleton />
        </div>
      ) : inbox.length > 0 ? (
        <section className="grid gap-2">
          <div className="grid gap-0.5">
            <h3 className="text-sm font-semibold">{t("inbox.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("inbox.description")}
            </p>
          </div>
          <ul className="grid gap-2">
            {inbox.map((item) => (
              <InboxRow
                key={`${item.recurringBillId}:${item.dueOn}`}
                item={item}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {billsQuery.isLoading ? null : bills.length === 0 ? (
        <Empty>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </Empty>
      ) : (
        <ul className="grid gap-3">
          {bills.map((bill) => (
            <BillCard
              key={bill.recurringBillId}
              bill={bill}
              accountLabel={accountName.get(bill.accountId) ?? bill.accountId}
              categoryLabel={
                bill.categoryId
                  ? (categoryName.get(bill.categoryId) ??
                    t("card.uncategorized"))
                  : t("card.uncategorized")
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** A confirmation-inbox row: estimate details + an inline real-amount confirm. */
function InboxRow({ item }: { item: ConfirmableOccurrence }) {
  const t = useTranslations("economy.recurring.inbox");
  const tr = useTranslations("economy.recurring");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(item.amount.amount);
  // Default to the occurrence's own due date, not today — confirming a backlog
  // occurrence must book the transaction into the period it belongs to, not the
  // current one. The user can still override the date deliberately.
  const [occurredOn, setOccurredOn] = useState(item.dueOn);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    ...confirmEconomyEstimatedBillMutation(),
    onSuccess: async () => {
      await invalidateAfterRecurringChange(queryClient, householdId);
      toast.success(t("confirmed"));
      setOpen(false);
    },
    onError: (error) => {
      const problem = error as unknown as ProblemDetails;
      const errors = mapProblemToFieldErrors(problem);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      handleProblem(problem);
    },
  });

  const submit = () => {
    setFieldErrors({});
    if (!isValidMoneyAmount(amount)) {
      setFieldErrors({ amount: t("amountLabel") });
      return;
    }
    const parsed = zConfirmEstimatedBillRequest.safeParse({
      householdId,
      transactionId: item.transactionId,
      amount: toMoneyRequest(amount),
      occurredOn,
    });
    if (!parsed.success) {
      setFieldErrors({ amount: t("amountLabel") });
      return;
    }
    void mutation.mutateAsync({
      path: { recurringBillId: item.recurringBillId },
      body: parsed.data,
    });
  };

  return (
    <li className="grid gap-3 border px-3 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="grid min-w-0 gap-0.5">
          <span className="truncate text-sm font-medium">{item.billName}</span>
          <span className="text-xs text-muted-foreground">
            {tr("occurrence.due", { date: formatEconomyDate(item.dueOn) })}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Money value={item.amount} className="text-sm font-medium" />
          {open ? null : (
            <Button size="sm" onClick={() => setOpen(true)}>
              {t("confirm")}
            </Button>
          )}
        </div>
      </div>

      {open ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field data-invalid={Boolean(fieldErrors.amount)}>
            <FieldLabel
              htmlFor={`amount-${item.recurringBillId}-${item.dueOn}`}
            >
              {t("amountLabel")}
            </FieldLabel>
            <FieldContent>
              <MoneyInput
                id={`amount-${item.recurringBillId}-${item.dueOn}`}
                value={amount}
                onValueChange={setAmount}
                aria-invalid={Boolean(fieldErrors.amount)}
              />
              <FieldError>{fieldErrors.amount}</FieldError>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor={`date-${item.recurringBillId}-${item.dueOn}`}>
              {t("occurredOnLabel")}
            </FieldLabel>
            <FieldContent>
              <Input
                id={`date-${item.recurringBillId}-${item.dueOn}`}
                type="date"
                value={occurredOn}
                onChange={(event) => setOccurredOn(event.target.value)}
              />
            </FieldContent>
          </Field>
          <div className="flex gap-2">
            <Button size="sm" disabled={mutation.isPending} onClick={submit}>
              {mutation.isPending ? t("submitting") : t("submit")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function BillCard({
  bill,
  accountLabel,
  categoryLabel,
}: {
  bill: RecurringBillResponse;
  accountLabel: string;
  categoryLabel: string;
}) {
  const t = useTranslations("economy.recurring");
  const isEstimated = bill.type === RECURRING_BILL_TYPE.Estimated;

  return (
    <li className="grid gap-3 border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{bill.name}</span>
            <Badge variant={isEstimated ? "default" : "secondary"}>
              {t(`type.${bill.type}`)}
            </Badge>
            <Badge variant="outline">{t(`direction.${bill.direction}`)}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatCadence(bill, (key, values) => t(`cadence.${key}`, values))}
            {" · "}
            {t("card.nextDue", { date: formatEconomyDate(bill.nextDueOn) })}
          </span>
          <span className="text-xs text-muted-foreground">
            {`${t("card.account")}: ${accountLabel} · ${t("card.category")}: ${categoryLabel}`}
          </span>
        </div>
        <Money value={bill.amount} className="text-sm font-medium" />
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {t("occurrence.title")}
        </span>
        {bill.pendingOccurrences.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            {t("card.noOccurrences")}
          </span>
        ) : (
          <ul className="grid gap-1.5">
            {bill.pendingOccurrences.map((occ) => (
              <OccurrenceRow
                key={occ.dueOn}
                recurringBillId={bill.recurringBillId}
                occurrence={occ}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function OccurrenceRow({
  recurringBillId,
  occurrence,
}: {
  recurringBillId: string;
  occurrence: RecurringBillOccurrenceResponse;
}) {
  const t = useTranslations("economy.recurring.occurrence");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();

  const onError = (error: unknown) =>
    handleProblem(error as unknown as ProblemDetails);
  const onSettledInvalidate = () =>
    invalidateAfterRecurringChange(queryClient, householdId);

  const skip = useMutation({
    ...skipEconomyRecurringBillOccurrenceMutation(),
    onSuccess: async () => {
      await onSettledInvalidate();
      toast.success(t("skipped"));
    },
    onError,
  });
  const pause = useMutation({
    ...pauseEconomyRecurringBillOccurrenceMutation(),
    onSuccess: async () => {
      await onSettledInvalidate();
      toast.success(t("paused"));
    },
    onError,
  });
  const resume = useMutation({
    ...resumeEconomyRecurringBillOccurrenceMutation(),
    onSuccess: async () => {
      await onSettledInvalidate();
      toast.success(t("resumed"));
    },
    onError,
  });

  const body = { householdId, dueOn: occurrence.dueOn };
  const path = { recurringBillId };
  const isPaused = occurrence.state === OCCURRENCE_STATE.Paused;
  const isActionable =
    occurrence.state === OCCURRENCE_STATE.Pending ||
    occurrence.state === OCCURRENCE_STATE.Posted;
  const pending = skip.isPending || pause.isPending || resume.isPending;

  return (
    <li className="flex items-center justify-between gap-3 border px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-xs">
          {t("due", { date: formatEconomyDate(occurrence.dueOn) })}
        </span>
        <Badge variant="outline">{t(`state.${occurrence.state}`)}</Badge>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {isPaused ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void resume.mutateAsync({ path, body })}
          >
            {t("resume")}
          </Button>
        ) : isActionable ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void pause.mutateAsync({ path, body })}
            >
              {t("pause")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => void skip.mutateAsync({ path, body })}
            >
              {t("skip")}
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Confirming or changing an occurrence can book/settle a real transaction and
 * shift balances and budget actuals, so invalidate those alongside the bills
 * list. The budget-summary key varies by `anchorDate`, so match every period
 * for this household via predicate (mirrors `transfer-form`).
 */
async function invalidateAfterRecurringChange(
  queryClient: ReturnType<typeof useQueryClient>,
  householdId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: listEconomyRecurringBillsQueryKey({ query: { householdId } }),
    }),
    queryClient.invalidateQueries({
      queryKey: listEconomyTransactionsQueryKey({ query: { householdId } }),
    }),
    queryClient.invalidateQueries({
      queryKey: getEconomyAccountBalancesQueryKey({ query: { householdId } }),
    }),
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as {
          _id?: string;
          query?: { householdId?: string };
        };
        return (
          key?._id === "getEconomyBudgetSummary" &&
          key?.query?.householdId === householdId
        );
      },
    }),
  ]);
}
