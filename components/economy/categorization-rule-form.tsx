"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  createEconomyCategorizationRuleMutation,
  listEconomyCategoriesOptions,
  listEconomyCategorizationRulesQueryKey,
  updateEconomyCategorizationRuleMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { CategorizationRuleResponse } from "@/api/generated";
import { zCategorizationRuleRequest } from "@/api/generated/zod.gen";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
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
import { Switch } from "@/components/ui/switch";
import { flattenCategories } from "@/lib/economy/category-tree";
import { RULE_MATCH } from "@/lib/economy/categorization-rule";
import { useHousehold } from "@/lib/household-context";

type CategorizationRuleFormProps = {
  /** When provided, the form edits this rule; otherwise it creates a new one. */
  rule?: CategorizationRuleResponse;
  onSuccess?: () => void;
  onCancel?: () => void;
};

/**
 * Create or edit a categorization rule. `Contains` is the default match;
 * `Regex` is gated behind an "Advanced" toggle. Regex compile/timeout failures
 * come back as 422 keyed to `pattern` and map through the ProblemDetails mapper
 * — there is **no** client-side regex evaluation. Membership-gated.
 */
export function CategorizationRuleForm({
  rule,
  onSuccess,
  onCancel,
}: CategorizationRuleFormProps) {
  const t = useTranslations("economy.rules.form");
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState(rule?.match === RULE_MATCH.Regex);

  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );
  const flatCategories = flattenCategories(
    categoriesQuery.data?.categories ?? [],
  );

  const onError = (error: unknown) => {
    const problem = error as unknown as ProblemDetails;
    const errors = mapProblemToFieldErrors(problem);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    handleProblem(problem);
  };

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: listEconomyCategorizationRulesQueryKey({
        query: { householdId },
      }),
    });

  const createMutation = useMutation({
    ...createEconomyCategorizationRuleMutation(),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("created"));
      onSuccess?.();
    },
    onError,
  });
  const updateMutation = useMutation({
    ...updateEconomyCategorizationRuleMutation(),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("updated"));
      onSuccess?.();
    },
    onError,
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm({
    defaultValues: {
      pattern: rule?.pattern ?? "",
      targetCategoryId: rule?.targetCategoryId ?? "",
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      if (!value.pattern.trim()) {
        setFieldErrors({ pattern: t("required") });
        return;
      }
      if (!value.targetCategoryId) {
        setFieldErrors({ targetCategoryId: t("required") });
        return;
      }

      const parsed = zCategorizationRuleRequest.safeParse({
        householdId,
        match: advanced ? RULE_MATCH.Regex : RULE_MATCH.Contains,
        pattern: value.pattern.trim(),
        targetCategoryId: value.targetCategoryId,
      });
      if (!parsed.success) {
        setFieldErrors({ pattern: t("required") });
        return;
      }

      if (rule) {
        await updateMutation.mutateAsync({
          path: { ruleId: rule.categorizationRuleId },
          body: parsed.data,
        });
      } else {
        await createMutation.mutateAsync({ body: parsed.data });
      }
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
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="rule-advanced">
              {t("advanced.label")}
            </FieldLabel>
            <FieldDescription>{t("advanced.hint")}</FieldDescription>
          </FieldContent>
          <Switch
            id="rule-advanced"
            checked={advanced}
            onCheckedChange={setAdvanced}
          />
        </Field>

        <form.Field name="pattern">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.pattern)}>
              <FieldLabel htmlFor={field.name}>
                {advanced
                  ? t("pattern.regexLabel")
                  : t("pattern.containsLabel")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id={field.name}
                  type="text"
                  value={field.state.value}
                  placeholder={
                    advanced
                      ? t("pattern.regexPlaceholder")
                      : t("pattern.containsPlaceholder")
                  }
                  aria-invalid={Boolean(fieldErrors.pattern)}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <FieldDescription>
                  {advanced
                    ? t("pattern.regexHint")
                    : t("pattern.containsHint")}
                </FieldDescription>
                <FieldError>{fieldErrors.pattern}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="targetCategoryId">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.targetCategoryId)}>
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
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={Boolean(fieldErrors.targetCategoryId)}
                  >
                    <SelectValue placeholder={t("category.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
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
                <FieldError>{fieldErrors.targetCategoryId}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <div className="flex gap-2">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting || isPending ? t("submitting") : t("submit")}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="ghost" onClick={() => onCancel?.()}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
