"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { ProjectResponse, ProjectStatus } from "@/api/generated";
import {
  createPropertyProjectMutation,
  getPropertyProjectQueryKey,
  listPropertyProjectsQueryKey,
  updatePropertyProjectMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import { zProjectRequest } from "@/api/generated/zod.gen";
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
import { Textarea } from "@/components/ui/textarea";
import { isValidMoneyAmount, toMoneyRequest } from "@/lib/economy/money";
import { useHousehold } from "@/lib/household-context";
import { PROJECT_STATUS_OPTIONS } from "@/lib/property/enums";

// Field limits (Property plan §1.11) — enforced in the UI; the backend returns
// 422 for anything longer, mapped through the ProblemDetails handler.
const NAME_MAX = 160;
const AREA_MAX = 100;
const DESCRIPTION_MAX = 2000;
const NOTES_MAX = 4000;

type ProjectFormProps = {
  /** Present → edit mode (prefilled, PUT). Absent → create mode (POST). */
  project?: ProjectResponse;
  onSuccess?: (project: ProjectResponse) => void;
  onCancel?: () => void;
};

export function ProjectForm({
  project,
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const t = useTranslations("property.projects.form");
  const te = useTranslations("property.enums.projectStatus");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(project);

  // Create and update have incompatible `Options` shapes (update needs a
  // `path`), so they can't share one `useMutation`. Declare both unconditionally
  // (rules-of-hooks safe) with shared success/error handlers, and fire the one
  // that matches the mode on submit.
  const handleSuccess = async (data: ProjectResponse) => {
    await queryClient.invalidateQueries({
      queryKey: listPropertyProjectsQueryKey({ query: { householdId } }),
    });
    if (project) {
      await queryClient.invalidateQueries({
        queryKey: getPropertyProjectQueryKey({
          path: { projectId: project.projectId },
          query: { householdId },
        }),
      });
    }
    toast.success(isEdit ? t("updatedToast") : t("createdToast"));
    if (!isEdit) form.reset();
    onSuccess?.(data);
  };

  const handleError = (error: unknown) => {
    const problem = error as unknown as ProblemDetails;
    const errors = mapProblemToFieldErrors(problem);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    handleProblem(problem);
  };

  const createMutation = useMutation({
    ...createPropertyProjectMutation(),
    onSuccess: handleSuccess,
    onError: handleError,
  });
  const updateMutation = useMutation({
    ...updatePropertyProjectMutation(),
    onSuccess: handleSuccess,
    onError: handleError,
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm({
    defaultValues: {
      name: project?.name ?? "",
      status: (project?.status ?? "Planning") as ProjectStatus,
      area: project?.area ?? "",
      description: project?.description ?? "",
      targetStartDate: project?.targetStartDate ?? "",
      targetEndDate: project?.targetEndDate ?? "",
      // MoneyDto.amount is typed `string` but the backend can serialize it as a
      // JSON number (e.g. 50000) — coerce so the controlled text field (and its
      // `.trim()` on submit) always gets a string.
      budgetEstimate:
        project?.budgetEstimate?.amount == null
          ? ""
          : String(project.budgetEstimate.amount),
      notes: project?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      const name = value.name.trim();
      if (!name) {
        setFieldErrors({ name: t("name.label") });
        return;
      }

      const start = value.targetStartDate || null;
      const end = value.targetEndDate || null;
      if (start && end && end < start) {
        setFieldErrors({ targetEndDate: t("invalidDates") });
        return;
      }

      const rawBudget = value.budgetEstimate.trim();
      if (rawBudget && !isValidMoneyAmount(rawBudget)) {
        setFieldErrors({ budgetEstimate: t("invalidBudget") });
        return;
      }

      const parsed = zProjectRequest.safeParse({
        householdId,
        name,
        status: value.status,
        area: value.area.trim() || null,
        description: value.description.trim() || null,
        targetStartDate: start,
        targetEndDate: end,
        budgetEstimate: rawBudget ? toMoneyRequest(rawBudget) : null,
        notes: value.notes.trim() || null,
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

      if (isEdit && project) {
        await updateMutation.mutateAsync({
          path: { projectId: project.projectId },
          body: parsed.data,
        });
      } else {
        await createMutation.mutateAsync({ body: parsed.data });
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
        <form.Field name="name">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.name)}>
              <FieldLabel htmlFor={field.name}>{t("name.label")}</FieldLabel>
              <FieldContent>
                <Input
                  id={field.name}
                  type="text"
                  maxLength={NAME_MAX}
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

        <form.Field name="status">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("status.label")}</FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value) field.handleChange(value as ProjectStatus);
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {te(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="area">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.area)}>
              <FieldLabel htmlFor={field.name}>{t("area.label")}</FieldLabel>
              <FieldContent>
                <Input
                  id={field.name}
                  type="text"
                  maxLength={AREA_MAX}
                  value={field.state.value}
                  placeholder={t("area.placeholder")}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.area)}
                />
                <FieldError>{fieldErrors.area}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.description)}>
              <FieldLabel htmlFor={field.name}>
                {t("description.label")}
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id={field.name}
                  maxLength={DESCRIPTION_MAX}
                  value={field.state.value}
                  placeholder={t("description.placeholder")}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.description)}
                />
                <FieldError>{fieldErrors.description}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <form.Field name="targetStartDate">
            {(field) => (
              <Field data-invalid={Boolean(fieldErrors.targetStartDate)}>
                <FieldLabel htmlFor={field.name}>
                  {t("targetStartDate.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.targetStartDate)}
                  />
                  <FieldError>{fieldErrors.targetStartDate}</FieldError>
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="targetEndDate">
            {(field) => (
              <Field data-invalid={Boolean(fieldErrors.targetEndDate)}>
                <FieldLabel htmlFor={field.name}>
                  {t("targetEndDate.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.targetEndDate)}
                  />
                  <FieldError>{fieldErrors.targetEndDate}</FieldError>
                </FieldContent>
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="budgetEstimate">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.budgetEstimate)}>
              <FieldLabel htmlFor={field.name}>
                {t("budgetEstimate.label")}
              </FieldLabel>
              <FieldContent>
                <MoneyInput
                  id={field.name}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  aria-invalid={Boolean(fieldErrors.budgetEstimate)}
                />
                <FieldDescription>{t("budgetEstimate.hint")}</FieldDescription>
                <FieldError>{fieldErrors.budgetEstimate}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.notes)}>
              <FieldLabel htmlFor={field.name}>{t("notes.label")}</FieldLabel>
              <FieldContent>
                <Textarea
                  id={field.name}
                  maxLength={NOTES_MAX}
                  value={field.state.value}
                  placeholder={t("notes.placeholder")}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.notes)}
                />
                <FieldError>{fieldErrors.notes}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <div className="flex gap-2">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isSubmitting || isPending
                ? t("submitting")
                : isEdit
                  ? t("submitEdit")
                  : t("submitCreate")}
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
