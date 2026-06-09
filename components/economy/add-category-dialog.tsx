"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  addEconomyCategoryMutation,
  listEconomyCategoriesQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { zAddCategoryRequest } from "@/api/generated/zod.gen";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useHousehold } from "@/lib/household-context";

export type AddCategoryTarget = {
  /** Parent to attach the new category to. `null` creates a root category. */
  parentCategoryId: string | null;
  /** Parent name, for the dialog title when adding a subcategory. */
  parentName?: string;
};

type AddCategoryDialogProps = {
  target: AddCategoryTarget | null;
  onClose: () => void;
};

/**
 * Add a category or subcategory. The depth-2 limit is enforced by the caller
 * (it only offers "add subcategory" on root categories); a backend rejection is
 * still handled gracefully here via the ProblemDetails mapper as a backstop.
 *
 * Keyed by target in the parent so the form state resets between targets.
 */
export function AddCategoryDialog({ target, onClose }: AddCategoryDialogProps) {
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        {target ? (
          <AddCategoryForm
            key={target.parentCategoryId ?? "root"}
            target={target}
            onSuccess={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AddCategoryForm({
  target,
  onSuccess,
}: {
  target: AddCategoryTarget;
  onSuccess: () => void;
}) {
  const t = useTranslations("economy.categories.add");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    ...addEconomyCategoryMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: listEconomyCategoriesQueryKey({ query: { householdId } }),
      });
      toast.success(t("submit"));
      onSuccess();
    },
    onError: (error) => {
      const problem = error as unknown as ProblemDetails;
      const errors = mapProblemToFieldErrors(problem);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      // Backstop for a third-level rejection or any other business error.
      handleProblem(problem);
    },
  });

  const form = useForm({
    defaultValues: { name: "", budgetable: true },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      const name = value.name.trim();
      if (!name) {
        setFieldErrors({ name: t("name.label") });
        return;
      }
      const parsed = zAddCategoryRequest.safeParse({
        householdId,
        name,
        parentCategoryId: target.parentCategoryId,
        budgetable: value.budgetable,
      });
      if (!parsed.success) {
        setFieldErrors({ name: t("name.label") });
        return;
      }
      await mutation.mutateAsync({ body: parsed.data });
    },
  });

  const title =
    target.parentCategoryId && target.parentName
      ? t("childTitle", { parent: target.parentName })
      : t("title");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{t("budgetable.hint")}</DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
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
                  autoFocus
                />
                <FieldError>{fieldErrors.name}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="budgetable">
          {(field) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={field.name}>
                  {t("budgetable.label")}
                </FieldLabel>
                <FieldDescription>{t("budgetable.hint")}</FieldDescription>
              </FieldContent>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
              />
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onSuccess}
          disabled={mutation.isPending}
        >
          {t("cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting || mutation.isPending
                ? t("submitting")
                : t("submit")}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}
