"use client";

import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  createEconomyTransferMutation,
  getEconomyAccountBalancesQueryKey,
  listEconomyAccountsOptions,
  listEconomyCategoriesOptions,
  listEconomyTransactionsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { zCreateTransferRequest } from "@/api/generated/zod.gen";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import { MoneyInput } from "@/components/economy/money";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
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
import { Switch } from "@/components/ui/switch";
import { todayAnchorDate } from "@/lib/economy/anchor-date";
import { flattenCategories } from "@/lib/economy/category-tree";
import { isValidMoneyAmount, toMoneyRequest } from "@/lib/economy/money";
import { TRANSFER_MODE, defaultTransferMode } from "@/lib/economy/transfer";
import { useHousehold } from "@/lib/household-context";

const NONE = "__none__";

export function TransferForm() {
  const t = useTranslations("economy.transfers");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Once the user flips the savings toggle by hand, stop auto-deriving it from
  // the destination account type.
  const modeTouched = useRef(false);

  const accountsQuery = useQuery(
    listEconomyAccountsOptions({ query: { householdId } }),
  );
  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );

  const accounts = accountsQuery.data?.accounts ?? [];
  const flatCategories = flattenCategories(
    categoriesQuery.data?.categories ?? [],
  );

  const mutation = useMutation({
    ...createEconomyTransferMutation(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: listEconomyTransactionsQueryKey({ query: { householdId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: getEconomyAccountBalancesQueryKey({
            query: { householdId },
          }),
        }),
        // Budget actuals can shift when a savings allocation lands. The summary
        // key varies by anchorDate, so match every period for this household.
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
      toast.success(t("saved"));
      modeTouched.current = false;
      form.reset();
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

  const form = useForm({
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: "0",
      occurredOn: todayAnchorDate(),
      note: "",
      savings: false,
      categoryId: NONE,
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      if (!value.fromAccountId || !value.toAccountId) {
        setFieldErrors({ toAccountId: t("to.placeholder") });
        return;
      }
      if (value.fromAccountId === value.toAccountId) {
        setFieldErrors({ toAccountId: t("sameAccount") });
        return;
      }
      if (!isValidMoneyAmount(value.amount)) {
        setFieldErrors({ amount: t("amount.label") });
        return;
      }

      const mode = value.savings
        ? TRANSFER_MODE.Savings
        : TRANSFER_MODE.Neutral;
      const parsed = zCreateTransferRequest.safeParse({
        householdId,
        fromAccountId: value.fromAccountId,
        toAccountId: value.toAccountId,
        amount: toMoneyRequest(value.amount),
        occurredOn: value.occurredOn,
        note: value.note.trim() || null,
        mode,
        categoryId:
          mode === TRANSFER_MODE.Savings && value.categoryId !== NONE
            ? value.categoryId
            : null,
        payerId: null,
      });
      if (!parsed.success) {
        setFieldErrors({ amount: t("amount.label") });
        return;
      }

      await mutation.mutateAsync({ body: parsed.data });
    },
  });

  if (accountsQuery.isSuccess && accounts.length < 2) {
    return (
      <Empty>
        <EmptyTitle>{t("empty.title")}</EmptyTitle>
        <EmptyDescription>{t("empty.description")}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <form
      className="grid max-w-xl gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="fromAccountId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("from.label")}</FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value) field.handleChange(value);
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder={t("from.placeholder")} />
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
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="toAccountId">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.toAccountId)}>
              <FieldLabel htmlFor={field.name}>{t("to.label")}</FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (!value) return;
                    field.handleChange(value);
                    // Auto-default the savings toggle from the destination type
                    // until the user overrides it.
                    if (!modeTouched.current) {
                      const dest = accounts.find((a) => a.accountId === value);
                      form.setFieldValue(
                        "savings",
                        defaultTransferMode(dest?.type) ===
                          TRANSFER_MODE.Savings,
                      );
                    }
                  }}
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={Boolean(fieldErrors.toAccountId)}
                  >
                    <SelectValue placeholder={t("to.placeholder")} />
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
                <FieldError>{fieldErrors.toAccountId}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

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

        <form.Field name="savings">
          {(field) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={field.name}>
                  {t("savings.label")}
                </FieldLabel>
                <FieldDescription>{t("savings.hint")}</FieldDescription>
              </FieldContent>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => {
                  modeTouched.current = true;
                  field.handleChange(checked);
                }}
              />
            </Field>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.savings}>
          {(savings) =>
            savings ? (
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
                          <SelectValue
                            placeholder={t("category.placeholder")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>
                            {t("category.placeholder")}
                          </SelectItem>
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
                    </FieldContent>
                  </Field>
                )}
              </form.Field>
            ) : null
          }
        </form.Subscribe>
      </FieldGroup>

      <div>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting || mutation.isPending
                ? t("submitting")
                : t("submit")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
