"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  createEconomyRecurringBillMutation,
  listEconomyAccountsOptions,
  listEconomyCategoriesOptions,
  listEconomyRecurringBillsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { zCreateRecurringBillRequest } from "@/api/generated/zod.gen";
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
import {
  cadenceDayOptions,
  cadenceIntervalOptions,
} from "@/lib/economy/cadence";
import { flattenCategories } from "@/lib/economy/category-tree";
import { isValidMoneyAmount, toMoneyRequest } from "@/lib/economy/money";
import {
  RECURRING_BILL_DIRECTION,
  RECURRING_BILL_TYPE,
} from "@/lib/economy/recurring-bill";
import { useHousehold } from "@/lib/household-context";

const NONE = "__none__";

type RecurringBillFormProps = {
  /** Called after a successful create. Omitted → navigate back to the list. */
  onSuccess?: () => void;
  /** Called when the user cancels. Omitted → navigate back to the list. */
  onCancel?: () => void;
};

/**
 * Create a recurring bill. Cadence is monthly-only (frequency is fixed, not a
 * picker); interval is 1–12 and day-of-month is 1–28 (the backend stays
 * authoritative and 422s out-of-range). Membership-gated — no permission gate.
 */
export function RecurringBillForm({
  onSuccess,
  onCancel,
}: RecurringBillFormProps) {
  const t = useTranslations("economy.recurring.form");
  const tr = useTranslations("economy.recurring");
  const { push } = useRouter();
  const queryClient = useQueryClient();
  const { householdId, slug } = useHousehold();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const listHref = `/app/h/${slug}/economy/recurring`;

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
    ...createEconomyRecurringBillMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: listEconomyRecurringBillsQueryKey({ query: { householdId } }),
      });
      toast.success(t("saved"));
      if (onSuccess) {
        onSuccess();
      } else {
        push(listHref);
      }
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
      name: "",
      amount: "0",
      type: RECURRING_BILL_TYPE.Fixed as string,
      direction: RECURRING_BILL_DIRECTION.Expense as string,
      cadenceInterval: "1",
      cadenceDayOfMonth: "1",
      accountId: "",
      categoryId: NONE,
      startsOn: todayAnchorDate(),
      note: "",
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      if (!value.name.trim()) {
        setFieldErrors({ name: t("required") });
        return;
      }
      if (!value.accountId) {
        setFieldErrors({ accountId: t("required") });
        return;
      }
      if (!isValidMoneyAmount(value.amount)) {
        setFieldErrors({ amount: t("amount.label") });
        return;
      }

      const parsed = zCreateRecurringBillRequest.safeParse({
        householdId,
        name: value.name.trim(),
        accountId: value.accountId,
        categoryId: value.categoryId === NONE ? null : value.categoryId,
        amount: toMoneyRequest(value.amount),
        type: value.type,
        direction: value.direction,
        cadenceFrequency: "Monthly",
        cadenceInterval: Number(value.cadenceInterval),
        cadenceDayOfMonth: Number(value.cadenceDayOfMonth),
        startsOn: value.startsOn,
        note: value.note.trim() || null,
      });
      if (!parsed.success) {
        setFieldErrors({ amount: t("amount.label") });
        return;
      }

      await mutation.mutateAsync({ body: parsed.data });
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
        <form.Field name="name">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.name)}>
              <FieldLabel htmlFor={field.name}>{t("name.label")}</FieldLabel>
              <FieldContent>
                <Input
                  id={field.name}
                  type="text"
                  value={field.state.value}
                  placeholder={t("name.placeholder")}
                  aria-invalid={Boolean(fieldErrors.name)}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <FieldError>{fieldErrors.name}</FieldError>
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

        <form.Field name="type">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("type.label")}</FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value) field.handleChange(value);
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RECURRING_BILL_TYPE.Fixed}>
                      {tr("type.Fixed")}
                    </SelectItem>
                    <SelectItem value={RECURRING_BILL_TYPE.Estimated}>
                      {tr("type.Estimated")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {field.state.value === RECURRING_BILL_TYPE.Estimated
                    ? t("type.estimatedHint")
                    : t("type.fixedHint")}
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="direction">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                {t("direction.label")}
              </FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value) field.handleChange(value);
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RECURRING_BILL_DIRECTION.Expense}>
                      {tr("direction.Expense")}
                    </SelectItem>
                    <SelectItem value={RECURRING_BILL_DIRECTION.Income}>
                      {tr("direction.Income")}
                    </SelectItem>
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

        <Field>
          <FieldLabel>{t("cadence.frequencyLabel")}</FieldLabel>
          <FieldContent>
            <FieldDescription>{t("cadence.frequencyFixed")}</FieldDescription>
          </FieldContent>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <form.Field name="cadenceInterval">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  {t("cadence.intervalLabel")}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value) field.handleChange(value);
                    }}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cadenceIntervalOptions().map((interval) => (
                        <SelectItem key={interval} value={String(interval)}>
                          {`${interval} ${t("cadence.intervalUnit", { interval })}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="cadenceDayOfMonth">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  {t("cadence.dayLabel")}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value) field.handleChange(value);
                    }}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cadenceDayOptions().map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {t("cadence.dayValue", { day })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="startsOn">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                {t("startsOn.label")}
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
      </FieldGroup>

      <div className="flex gap-2">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting || mutation.isPending
                ? t("submitting")
                : t("submit")}
            </Button>
          )}
        </form.Subscribe>
        <Button
          type="button"
          variant="ghost"
          onClick={() => (onCancel ? onCancel() : push(listHref))}
        >
          {tr("inbox.cancel")}
        </Button>
      </div>
    </form>
  );
}
