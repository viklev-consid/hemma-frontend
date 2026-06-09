"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import {
  createEconomySettingsMutation,
  getEconomySettingsQueryKey,
  listEconomyCategoriesOptions,
  listEconomyCategoriesQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Spinner } from "@/components/ui/spinner";
import {
  cycleStartDayOptions,
  isValidCycleStartDay,
} from "@/lib/economy/cycle";
import { ECONOMY_CURRENCY } from "@/lib/economy/money";
import { useHousehold } from "@/lib/household-context";

type Step = "settings" | "categories";

const DAY_OPTIONS = cycleStartDayOptions();

export function EconomySetupWizard({ slug }: { slug: string }) {
  const t = useTranslations("economy.setup");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();

  const [step, setStep] = useState<Step>("settings");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    ...createEconomySettingsMutation(),
    onSuccess: async () => {
      // The POST seeds root categories server-side — refresh both reads so the
      // confirm step (and later screens) see initialized state.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getEconomySettingsQueryKey({ query: { householdId } }),
        }),
        queryClient.invalidateQueries({
          queryKey: listEconomyCategoriesQueryKey({ query: { householdId } }),
        }),
      ]);
      setStep("categories");
    },
    onError: (error) => {
      // Out-of-range cycleStartDay → 422 with `errors.CycleStartDay`, which the
      // ProblemDetails mapper turns into a `cycleStartDay` field error.
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
    defaultValues: { cycleStartDay: 1 },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      if (!isValidCycleStartDay(value.cycleStartDay)) {
        setFieldErrors({ cycleStartDay: t("cycleStartDay.hint") });
        return;
      }
      await mutation.mutateAsync({
        body: {
          householdId,
          cycleStartDay: value.cycleStartDay,
          defaultCurrency: ECONOMY_CURRENCY,
        },
      });
    },
  });

  if (step === "categories") {
    return <SeededCategories slug={slug} householdId={householdId} />;
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            {/* Currency is fixed to SEK — shown read-only, never a picker. */}
            <Field>
              <FieldLabel htmlFor="economy-currency">
                {t("currency.label")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="economy-currency"
                  value={t("currency.fixedValue")}
                  readOnly
                  disabled
                />
                <FieldDescription>{t("currency.hint")}</FieldDescription>
              </FieldContent>
            </Field>

            <form.Field name="cycleStartDay">
              {(field) => (
                <Field data-invalid={Boolean(fieldErrors.cycleStartDay)}>
                  <FieldLabel htmlFor={field.name}>
                    {t("cycleStartDay.label")}
                  </FieldLabel>
                  <FieldContent>
                    <Select
                      value={String(field.state.value)}
                      onValueChange={(value) => {
                        if (value) {
                          field.handleChange(Number(value));
                        }
                      }}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={Boolean(fieldErrors.cycleStartDay)}
                      >
                        <SelectValue
                          placeholder={t("cycleStartDay.placeholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_OPTIONS.map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {t("cycleStartDay.dayLabel", { day })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {t("cycleStartDay.hint")}
                    </FieldDescription>
                    <FieldError>{fieldErrors.cycleStartDay}</FieldError>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          <div>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  disabled={isSubmitting || mutation.isPending}
                >
                  {isSubmitting || mutation.isPending
                    ? t("submitting")
                    : t("submit")}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Confirm step: the POST seeded root categories (Food, Housing, Transport,
 * Savings, Personal — all budgetable). Names are user data, rendered verbatim
 * (the backend seeds English; see open-Q #2 in the Phase 1 plan). This step
 * just displays them — no editing here.
 */
function SeededCategories({
  slug,
  householdId,
}: {
  slug: string;
  householdId: string;
}) {
  const t = useTranslations("economy.setup.categories");
  const { push } = useRouter();
  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );

  const categories = categoriesQuery.data?.categories ?? [];

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {categoriesQuery.isLoading ? (
          <div className="grid place-items-center py-6">
            <Spinner />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid gap-2">
            {categories.map((category) => (
              <li
                key={category.categoryId}
                className="flex items-center justify-between gap-3 border px-3 py-2"
              >
                <span className="text-sm">{category.name}</span>
                <Badge variant={category.budgetable ? "default" : "secondary"}>
                  {category.budgetable ? t("budgetable") : t("tracked")}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <div>
          <Button onClick={() => push(`/app/h/${slug}/economy/budget`)}>
            {t("continue")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
