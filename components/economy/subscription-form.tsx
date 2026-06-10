"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  createEconomySubscriptionMutation,
  listEconomyAccountsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { zCreateSubscriptionRequest } from "@/api/generated/zod.gen";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import { MoneyInput } from "@/components/economy/money";
import { invalidateAfterSubscriptionChange } from "@/components/economy/subscription-invalidation";
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
import { isValidMoneyAmount, toMoneyRequest } from "@/lib/economy/money";
import {
  SUBSCRIPTION_LIFECYCLE_STATE,
  subscriptionChargeDayOptions,
  subscriptionIntervalOptions,
} from "@/lib/economy/subscription";
import { useHousehold } from "@/lib/household-context";

const NONE = "__none__";

/**
 * The create form never offers `Cancelled` — the backend 422s creating a
 * subscription in a terminal state. Order matches the lifecycle: trial →
 * active → paused.
 */
const CREATABLE_STATES = [
  SUBSCRIPTION_LIFECYCLE_STATE.Trial,
  SUBSCRIPTION_LIFECYCLE_STATE.Active,
  SUBSCRIPTION_LIFECYCLE_STATE.Paused,
] as const;

type SubscriptionFormProps = {
  /** Called after a successful create (e.g. close the dialog). */
  onSuccess?: () => void;
  /** Called when the user cancels. */
  onCancel?: () => void;
};

/**
 * Create a subscription — observe-only: this registers something to *watch*,
 * it never books money (copy says "expected", no pay/charge affordance).
 * Cadence is monthly-only; interval is 1–24 (wider than bills' 1–12) and
 * charge day 1–28. `trialEndsOn` is required when state is Trial (the input
 * only renders then) and sent as `null` otherwise — the key is required in
 * the contract, and the server nulls it for non-Trial states regardless.
 * Membership-gated — no permission gate.
 */
export function SubscriptionForm({
  onSuccess,
  onCancel,
}: SubscriptionFormProps) {
  const t = useTranslations("economy.subscriptions.form");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: accountsData } = useQuery(
    listEconomyAccountsOptions({ query: { householdId } }),
  );
  const accounts = accountsData?.accounts ?? [];

  const mutation = useMutation({
    ...createEconomySubscriptionMutation(),
    onSuccess: async () => {
      await invalidateAfterSubscriptionChange(queryClient, householdId);
      toast.success(t("saved"));
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
      expectedAmount: "0",
      cadenceInterval: "1",
      chargeDay: "1",
      lifecycleState: SUBSCRIPTION_LIFECYCLE_STATE.Active as string,
      trialEndsOn: "",
      accountId: NONE,
      startsOn: todayAnchorDate(),
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      const isTrial =
        value.lifecycleState === SUBSCRIPTION_LIFECYCLE_STATE.Trial;
      if (!value.name.trim()) {
        setFieldErrors({ name: t("required") });
        return;
      }
      if (!isValidMoneyAmount(value.expectedAmount)) {
        setFieldErrors({ expectedAmount: t("expectedAmount.label") });
        return;
      }
      if (isTrial && !value.trialEndsOn) {
        setFieldErrors({ trialEndsOn: t("required") });
        return;
      }

      const parsed = zCreateSubscriptionRequest.safeParse({
        householdId,
        name: value.name.trim(),
        cadenceFrequency: "Monthly",
        cadenceInterval: Number(value.cadenceInterval),
        chargeDay: Number(value.chargeDay),
        expectedAmount: toMoneyRequest(value.expectedAmount),
        lifecycleState: value.lifecycleState,
        trialEndsOn: isTrial ? value.trialEndsOn : null,
        accountId: value.accountId === NONE ? null : value.accountId,
        startsOn: value.startsOn,
      });
      if (!parsed.success) {
        setFieldErrors({ expectedAmount: t("expectedAmount.label") });
        return;
      }

      await mutation.mutateAsync({ body: parsed.data });
    },
  });

  return (
    <form
      className="grid gap-5"
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

        <form.Field name="expectedAmount">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.expectedAmount)}>
              <FieldLabel htmlFor={field.name}>
                {t("expectedAmount.label")}
              </FieldLabel>
              <FieldContent>
                <MoneyInput
                  id={field.name}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  aria-invalid={Boolean(fieldErrors.expectedAmount)}
                />
                <FieldDescription>{t("expectedAmount.hint")}</FieldDescription>
                <FieldError>{fieldErrors.expectedAmount}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

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
                      {subscriptionIntervalOptions().map((interval) => (
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

          <form.Field name="chargeDay">
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
                      {subscriptionChargeDayOptions().map((day) => (
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

        <form.Field name="lifecycleState">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("state.label")}</FieldLabel>
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
                    {CREATABLE_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {t(`state.${state}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.lifecycleState}>
          {(lifecycleState) =>
            lifecycleState === SUBSCRIPTION_LIFECYCLE_STATE.Trial ? (
              <form.Field name="trialEndsOn">
                {(field) => (
                  <Field data-invalid={Boolean(fieldErrors.trialEndsOn)}>
                    <FieldLabel htmlFor={field.name}>
                      {t("trialEndsOn.label")}
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id={field.name}
                        type="date"
                        value={field.state.value}
                        aria-invalid={Boolean(fieldErrors.trialEndsOn)}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                      <FieldError>{fieldErrors.trialEndsOn}</FieldError>
                    </FieldContent>
                  </Field>
                )}
              </form.Field>
            ) : null
          }
        </form.Subscribe>

        <form.Field name="accountId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("account.label")}</FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value) field.handleChange(value);
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder={t("account.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      {t("account.placeholder")}
                    </SelectItem>
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
                <FieldDescription>{t("account.hint")}</FieldDescription>
              </FieldContent>
            </Field>
          )}
        </form.Field>

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
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
