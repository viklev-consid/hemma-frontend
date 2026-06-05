"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { zChangePasswordRequest } from "@/api/generated/zod.gen";
import { mapProblemToFieldErrors, type ProblemDetails } from "@/api/problems";
import { fetchJson, fieldMessage } from "@/components/settings/client-fetch";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const t = useTranslations("settingsForms.password");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value, formApi }) => {
      setFieldErrors({});
      if (value.newPassword !== value.confirmPassword) {
        setFieldErrors({ confirmPassword: t("mismatch") });
        return;
      }

      const parsed = zChangePasswordRequest.safeParse({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      });

      if (!parsed.success) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(parsed.error.flatten().fieldErrors).map(
              ([field, messages]) => [field, messages[0] ?? t("invalidValue")],
            ),
          ),
        );
        return;
      }

      try {
        await fetchJson("/api/proxy/v1/users/me/password", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        formApi.reset();
        toast.success(t("saved"));
      } catch (error) {
        const problem = error as ProblemDetails;
        const nextErrors = mapProblemToFieldErrors(problem);
        setFieldErrors({
          ...nextErrors,
          currentPassword:
            nextErrors.currentPassword ??
            fieldMessage(problem, "currentPassword", t("checkPassword")),
        });
      }
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
            <form.Field name="currentPassword">
              {(field) => (
                <Field data-invalid={Boolean(fieldErrors.currentPassword)}>
                  <FieldLabel htmlFor={field.name}>
                    {t("currentLabel")}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id={field.name}
                      type="password"
                      autoComplete="current-password"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors.currentPassword)}
                    />
                    <FieldError>{fieldErrors.currentPassword}</FieldError>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
            <form.Field name="newPassword">
              {(field) => (
                <Field data-invalid={Boolean(fieldErrors.newPassword)}>
                  <FieldLabel htmlFor={field.name}>{t("newLabel")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id={field.name}
                      type="password"
                      autoComplete="new-password"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors.newPassword)}
                    />
                    <FieldError>{fieldErrors.newPassword}</FieldError>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
            <form.Field name="confirmPassword">
              {(field) => (
                <Field data-invalid={Boolean(fieldErrors.confirmPassword)}>
                  <FieldLabel htmlFor={field.name}>
                    {t("confirmLabel")}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id={field.name}
                      type="password"
                      autoComplete="new-password"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    />
                    <FieldError>{fieldErrors.confirmPassword}</FieldError>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button className="w-fit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("submitting") : t("submit")}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  );
}
