"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  attachEconomyTransactionReceiptMutation,
  getEconomyAccountBalancesQueryKey,
  listEconomyAccountsOptions,
  listEconomyCategoriesOptions,
  listEconomyTransactionsQueryKey,
  listHouseholdMembersOptions,
  recordEconomyTransactionMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { TransactionKind } from "@/api/generated";
import { zRecordTransactionRequest } from "@/api/generated/zod.gen";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import { MoneyInput } from "@/components/economy/money";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { todayAnchorDate } from "@/lib/economy/anchor-date";
import { flattenCategories } from "@/lib/economy/category-tree";
import { isValidMoneyAmount, toMoneyRequest } from "@/lib/economy/money";
import { payerOptionsFromMembers } from "@/lib/economy/payer";
import {
  RECEIPT_ACCEPT,
  validateReceiptFile,
  type ReceiptValidationError,
} from "@/lib/economy/receipt";
import { useHousehold } from "@/lib/household-context";

// Sentinel values for the optional selects — Base UI Select can't hold "" as a
// real value, so we map these back to `null` on submit.
const NONE = "__none__";

// Expense/Income only — money movement goes through transfers, never a
// directly-recorded `Transfer` kind. `as const` keeps the i18n key literal
// narrow (no `kind.Transfer` key exists in the record namespace).
const TRANSACTION_KINDS = [
  "Expense",
  "Income",
] as const satisfies readonly TransactionKind[];

type RecordTransactionFormProps = {
  slug: string;
  onCancel?: () => void;
  onSuccess?: () => void;
};

export function RecordTransactionForm({
  slug,
  onCancel,
  onSuccess,
}: RecordTransactionFormProps) {
  const t = useTranslations("economy.transactions.record");
  const { push } = useRouter();
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const receiptErrorMessage = (problem: ReceiptValidationError) =>
    problem === "type"
      ? t("receipt.errorType")
      : problem === "size"
        ? t("receipt.errorSize")
        : t("receipt.errorEmpty");

  const accountsQuery = useQuery(
    listEconomyAccountsOptions({ query: { householdId } }),
  );
  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );
  const membersQuery = useQuery(
    listHouseholdMembersOptions({ path: { householdRef: slug } }),
  );

  const accounts = accountsQuery.data?.accounts ?? [];
  const flatCategories = flattenCategories(
    categoriesQuery.data?.categories ?? [],
  );
  const payerOptions = payerOptionsFromMembers(
    membersQuery.data?.members ?? [],
  );

  // Record and receipt-attach are separate mutations sequenced in onSubmit:
  // record first, then (if a file was chosen) attach. A failed attach must not
  // discard the saved transaction — see onSubmit.
  const recordMutation = useMutation({
    ...recordEconomyTransactionMutation(),
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
  const attachMutation = useMutation(attachEconomyTransactionReceiptMutation());

  const isPending = recordMutation.isPending || attachMutation.isPending;

  const form = useForm({
    defaultValues: {
      amount: "0",
      kind: "Expense" as TransactionKind,
      accountId: "",
      categoryId: NONE,
      occurredOn: todayAnchorDate(),
      note: "",
      payerId: NONE,
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      if (!isValidMoneyAmount(value.amount)) {
        setFieldErrors({ amount: t("amount.label") });
        return;
      }
      if (!value.accountId) {
        setFieldErrors({ accountId: t("account.placeholder") });
        return;
      }

      const parsed = zRecordTransactionRequest.safeParse({
        householdId,
        accountId: value.accountId,
        categoryId: value.categoryId === NONE ? null : value.categoryId,
        amount: toMoneyRequest(value.amount),
        occurredOn: value.occurredOn,
        note: value.note.trim() || null,
        kind: value.kind,
        payerId: value.payerId === NONE ? null : value.payerId,
      });
      if (!parsed.success) {
        setFieldErrors({ amount: t("amount.label") });
        return;
      }

      let recorded;
      try {
        recorded = await recordMutation.mutateAsync({ body: parsed.data });
      } catch {
        // recordMutation.onError already surfaced the problem.
        return;
      }

      // Attach the receipt if one was chosen. A failed attach keeps the saved
      // transaction — the user can re-attach from the list row (WS3).
      let receiptAttached = false;
      if (receiptFile) {
        try {
          await attachMutation.mutateAsync({
            path: { transactionId: recorded.transactionId },
            body: { householdId, file: receiptFile },
          });
          receiptAttached = true;
        } catch (error) {
          handleProblem(error as unknown as ProblemDetails);
          toast.error(t("receiptFailed"));
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: listEconomyTransactionsQueryKey({ query: { householdId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: getEconomyAccountBalancesQueryKey({
            query: { householdId },
          }),
        }),
      ]);
      toast.success(receiptAttached ? t("receiptAttached") : t("saved"));
      if (onSuccess) {
        onSuccess();
      } else {
        push(`/app/h/${slug}/economy/transactions`);
      }
    },
  });

  return (
    <form
      className="grid max-w-xl gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="amount">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.amount)}>
              <FieldLabel htmlFor={field.name}>{t("amount.label")}</FieldLabel>
              <FieldContent>
                <MoneyInput
                  id={field.name}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  aria-invalid={Boolean(fieldErrors.amount)}
                />
                <FieldError>{fieldErrors.amount}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="kind">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("kind.label")}</FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value) field.handleChange(value as TransactionKind);
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {t(`kind.${kind}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="accountId">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.accountId)}>
              <FieldLabel htmlFor={field.name}>{t("account.label")}</FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value) field.handleChange(value);
                  }}
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={Boolean(fieldErrors.accountId)}
                  >
                    <SelectValue placeholder={t("account.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem
                        key={account.accountId}
                        value={account.accountId}
                      >
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{fieldErrors.accountId}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="categoryId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                {t("category.label")}
              </FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value) field.handleChange(value);
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder={t("category.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("category.none")}</SelectItem>
                    {flatCategories.map(({ category, depth }) => (
                      <SelectItem
                        key={category.categoryId}
                        value={category.categoryId}
                      >
                        {`${"  ".repeat(depth)}${category.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="occurredOn">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                {t("occurredOn.label")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="note">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("note.label")}</FieldLabel>
              <FieldContent>
                <Input
                  id={field.name}
                  type="text"
                  value={field.state.value}
                  placeholder={t("note.placeholder")}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        {payerOptions.length > 0 ? (
          <form.Field name="payerId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("payer.label")}</FieldLabel>
                <FieldContent>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value) field.handleChange(value);
                    }}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder={t("payer.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("payer.none")}</SelectItem>
                      {payerOptions.map((payer) => (
                        <SelectItem key={payer.userId} value={payer.userId}>
                          {payer.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            )}
          </form.Field>
        ) : null}

        <Field data-invalid={Boolean(receiptError)}>
          <FieldLabel htmlFor="receipt-file">{t("receipt.label")}</FieldLabel>
          <FieldContent>
            <Input
              id="receipt-file"
              type="file"
              accept={RECEIPT_ACCEPT}
              aria-invalid={Boolean(receiptError)}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setReceiptFile(null);
                  setReceiptError(null);
                  return;
                }
                const problem = validateReceiptFile(file);
                if (problem) {
                  setReceiptFile(null);
                  setReceiptError(receiptErrorMessage(problem));
                  event.target.value = "";
                  return;
                }
                setReceiptFile(file);
                setReceiptError(null);
              }}
            />
            <FieldDescription>{t("receipt.hint")}</FieldDescription>
            <FieldError>{receiptError}</FieldError>
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex gap-2">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting || isPending ? t("submitting") : t("submit")}
            </Button>
          )}
        </form.Subscribe>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            onCancel ? onCancel() : push(`/app/h/${slug}/economy/transactions`)
          }
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
