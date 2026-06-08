"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getHouseholdQueryKey,
  listMyHouseholdsQueryKey,
  updateHouseholdMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import { zUpdateHouseholdRequest } from "@/api/generated/zod.gen";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useHousehold } from "@/lib/household-context";
import { isValidSlug } from "@/lib/slug";

/**
 * Edit household form.
 *
 * PATCH /v1/households/{ref} requires BOTH name and slug despite the
 * verb. The form prefills both from the current household and always sends both.
 * A slug change triggers a confirmation message about URL impact (no
 * old-slug redirects in v1).
 */
export function EditHouseholdForm() {
  const t = useTranslations("households.settings.edit");
  const household = useHousehold();
  const { push } = useRouter();
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    ...updateHouseholdMutation(),
    onSuccess: async (data) => {
      // Refresh both the per-household GET (name/slug/accessMode) and the
      // membership list (slug + name surface in the switcher).
      await queryClient.invalidateQueries({
        queryKey: getHouseholdQueryKey({
          path: { householdRef: household.slug },
        }),
      });
      await queryClient.invalidateQueries({
        queryKey: listMyHouseholdsQueryKey(),
      });
      toast.success(t("toast.saved"));
      // Slug change ⇒ the current URL is stale; route to the new one.
      if (data.slug !== household.slug) {
        push(`/app/h/${data.slug}/settings`);
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
    defaultValues: { name: household.name, slug: household.slug },
    onSubmit: async ({ value }) => {
      setFieldErrors({});

      const name = value.name.trim();
      const slug = value.slug.trim();

      if (!name) {
        setFieldErrors({ name: t("name.hint") });
        return;
      }
      if (!isValidSlug(slug)) {
        setFieldErrors({ slug: t("slug.invalid") });
        return;
      }

      const parsed = zUpdateHouseholdRequest.safeParse({ name, slug });
      if (!parsed.success) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(parsed.error.flatten().fieldErrors).map(
              ([field, messages]) => [
                field,
                messages?.[0] ?? t("slug.invalid"),
              ],
            ),
          ),
        );
        return;
      }

      await mutation.mutateAsync({
        path: { householdRef: household.slug },
        body: parsed.data,
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
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
                  <FieldLabel htmlFor={field.name}>
                    {t("name.label")}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors.name)}
                    />
                    <FieldDescription>{t("name.hint")}</FieldDescription>
                    <FieldError>{fieldErrors.name}</FieldError>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
            <form.Field name="slug">
              {(field) => (
                <Field data-invalid={Boolean(fieldErrors.slug)}>
                  <FieldLabel htmlFor={field.name}>
                    {t("slug.label")}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors.slug)}
                    />
                    <FieldDescription>{t("slug.hint")}</FieldDescription>
                    <FieldError>{fieldErrors.slug}</FieldError>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <form.Subscribe
            selector={(state) => ({
              isSubmitting: state.isSubmitting,
              slug: state.values.slug,
            })}
          >
            {({ isSubmitting, slug }) => {
              const slugChanged = slug !== household.slug;
              const pending = isSubmitting || mutation.isPending;
              return (
                <div className="grid gap-3">
                  {slugChanged ? (
                    <Alert>
                      <AlertDescription>
                        {t("slugChangeWarning")}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <Button type="submit" className="w-fit" disabled={pending}>
                    {pending
                      ? t("submitting")
                      : slugChanged
                        ? t("submitConfirm")
                        : t("submit")}
                  </Button>
                </div>
              );
            }}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  );
}
