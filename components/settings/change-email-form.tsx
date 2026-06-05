"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { MailCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { zRequestEmailChangeRequest } from "@/api/generated/zod.gen";
import { mapProblemToFieldErrors, type ProblemDetails } from "@/api/problems";
import { useAuth } from "@/components/auth-provider";
import { fetchJson } from "@/components/settings/client-fetch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

export function ChangeEmailForm() {
  const t = useTranslations("settingsForms.email");
  const tPassword = useTranslations("settingsForms.password");
  const { currentUser } = useAuth();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const form = useForm({
    defaultValues: {
      newEmail: "",
      currentPassword: "",
    },
    onSubmit: async ({ value, formApi }) => {
      setFieldErrors({});
      const parsed = zRequestEmailChangeRequest.safeParse(value);
      if (!parsed.success) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(parsed.error.flatten().fieldErrors).map(
              ([field, messages]) => [
                field,
                messages[0] ?? tPassword("invalidValue"),
              ],
            ),
          ),
        );
        return;
      }

      try {
        await fetchJson("/api/proxy/v1/users/me/email/request", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        setPendingEmail(parsed.data.newEmail);
        formApi.reset();
        toast.success(t("sentToast"));
      } catch (error) {
        setFieldErrors(mapProblemToFieldErrors(error as ProblemDetails));
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid max-w-xl gap-5">
        {pendingEmail && (
          <Alert>
            <MailCheckIcon />
            <AlertTitle>{t("pending.title")}</AlertTitle>
            <AlertDescription>
              {t.rich("pending.body", {
                email: pendingEmail,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="current-email">{t("currentLabel")}</FieldLabel>
          <FieldContent>
            <Input
              id="current-email"
              value={currentUser?.email ?? ""}
              readOnly
            />
            <FieldDescription>{t("currentHint")}</FieldDescription>
          </FieldContent>
        </Field>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="newEmail">
              {(field) => (
                <Field data-invalid={Boolean(fieldErrors.newEmail)}>
                  <FieldLabel htmlFor={field.name}>{t("newLabel")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id={field.name}
                      type="email"
                      autoComplete="email"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors.newEmail)}
                    />
                    <FieldDescription>{t("newHint")}</FieldDescription>
                    <FieldError>{fieldErrors.newEmail}</FieldError>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
            <form.Field name="currentPassword">
              {(field) => (
                <Field data-invalid={Boolean(fieldErrors.currentPassword)}>
                  <FieldLabel htmlFor={field.name}>
                    {t("passwordLabel")}
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
