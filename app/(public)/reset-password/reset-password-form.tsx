"use client";

import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  mapProblemToFieldErrors,
  problemFromResponse,
  type ProblemDetails,
} from "@/api/problems";
import { zResetPasswordRequest } from "@/api/generated/zod.gen";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResetPasswordContent() {
  const t = useTranslations("auth.resetPassword");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState("");

  const form = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setPageError("");

      if (value.newPassword !== value.confirmPassword) {
        setFieldErrors({ confirmPassword: t("mismatch") });
        return;
      }

      const parsed = zResetPasswordRequest.safeParse({
        token,
        newPassword: value.newPassword,
      });

      if (!parsed.success) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(parsed.error.flatten().fieldErrors).map(
              ([field, messages]) => [field, messages?.[0] ?? ""],
            ),
          ),
        );
        return;
      }

      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const problem = await problemFromResponse(response);
        setFieldErrors(mapProblemToFieldErrors(problem as ProblemDetails));
        setPageError(problem.detail ?? problem.title ?? t("linkError"));
        return;
      }

      toast.success(t("toast.title"), {
        description: t("toast.description"),
      });
      window.location.assign("/login");
    },
  });

  if (!token) {
    return (
      <ResetMessage
        title={t("missing.title")}
        description={t("missing.description")}
      />
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            {pageError && (
              <p className="text-xs text-destructive">
                {pageError}{" "}
                <Link href="/forgot-password" className="underline">
                  {t("requestNew")}
                </Link>
              </p>
            )}

            <FieldGroup>
              <form.Field name="newPassword">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("newLabel")}
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="password"
                      autoComplete="new-password"
                      value={field.state.value}
                      aria-invalid={Boolean(fieldErrors.newPassword)}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    <FieldDescription>{t("newHint")}</FieldDescription>
                    <FieldError>{fieldErrors.newPassword}</FieldError>
                  </Field>
                )}
              </form.Field>
              <form.Field name="confirmPassword">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("confirmLabel")}
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="password"
                      autoComplete="new-password"
                      value={field.state.value}
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    <FieldError>{fieldErrors.confirmPassword}</FieldError>
                  </Field>
                )}
              </form.Field>
            </FieldGroup>

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  className="w-full"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {t("submit")}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export function ResetShell() {
  const t = useTranslations("auth.resetPassword");
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("shellLoading")}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function ResetMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const t = useTranslations("auth.resetPassword.missing");
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <AlertTriangleIcon className="mb-2 size-5 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/forgot-password"
            className="inline-flex h-8 w-full items-center justify-center border border-border px-2.5 text-xs font-medium hover:bg-muted"
          >
            {t("cta")}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
