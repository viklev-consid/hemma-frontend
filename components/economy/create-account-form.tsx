"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  createEconomyAccountMutation,
  getEconomyAccountBalancesQueryKey,
  listEconomyAccountsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { AccountType } from "@/api/generated";
import { zCreateAccountRequest } from "@/api/generated/zod.gen";
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
import { isValidMoneyAmount, toMoneyRequest } from "@/lib/economy/money";
import { useHousehold } from "@/lib/household-context";

const ACCOUNT_TYPES: AccountType[] = ["Spending", "Savings"];

type CreateAccountFormProps = {
  onCancel?: () => void;
  onSuccess?: () => void;
};

export function CreateAccountForm({
  onCancel,
  onSuccess,
}: CreateAccountFormProps) {
  const t = useTranslations("economy.accounts.add");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    ...createEconomyAccountMutation(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: listEconomyAccountsQueryKey({ query: { householdId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: getEconomyAccountBalancesQueryKey({
            query: { householdId },
          }),
        }),
      ]);
      toast.success(t("title"));
      form.reset();
      onSuccess?.();
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
      type: "Spending" as AccountType,
      openingBalance: "0",
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      const name = value.name.trim();

      if (!name) {
        setFieldErrors({ name: t("name.label") });
        return;
      }
      if (!isValidMoneyAmount(value.openingBalance)) {
        setFieldErrors({ openingBalance: t("openingBalance.hint") });
        return;
      }

      const parsed = zCreateAccountRequest.safeParse({
        householdId,
        name,
        type: value.type,
        openingBalance: toMoneyRequest(value.openingBalance),
      });
      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors;
        setFieldErrors(
          Object.fromEntries(
            Object.entries(flat).map(([field, messages]) => [
              field,
              messages?.[0] ?? t("name.label"),
            ]),
          ),
        );
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
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                <FieldError>{fieldErrors.name}</FieldError>
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
                    if (value) {
                      field.handleChange(value as AccountType);
                    }
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`type.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="openingBalance">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.openingBalance)}>
              <FieldLabel htmlFor={field.name}>
                {t("openingBalance.label")}
              </FieldLabel>
              <FieldContent>
                <MoneyInput
                  id={field.name}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  aria-invalid={Boolean(fieldErrors.openingBalance)}
                />
                <FieldDescription>{t("openingBalance.hint")}</FieldDescription>
                <FieldError>{fieldErrors.openingBalance}</FieldError>
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
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
