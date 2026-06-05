"use client";

import Link from "next/link";
import { LockIcon, MailCheckIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { mapProblemToFieldErrors, type ProblemDetails } from "@/api/problems";
import { zRegisterRequest } from "@/api/generated/zod.gen";
import { useAuth } from "@/components/auth-provider";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type RegisterMode = "Open" | "InviteOnly" | "Disabled";

const registrationMode = (process.env.NEXT_PUBLIC_REGISTRATION_MODE ??
  "Open") as RegisterMode;

export function RegisterContent() {
  const t = useTranslations("auth.register");
  const { register, resendEmailConfirmation } = useAuth();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("token");
  // Org-invitation flow uses `?orgToken=` to avoid colliding with the
  // existing system-invitation `?token=` flow. When present we additionally
  // forward the email from the invite URL and lock the input so the user
  // can't accidentally diverge from what the backend expects.
  const organizationInvitationToken = searchParams.get("orgToken");
  const prefilledEmail = searchParams.get("email") ?? "";
  // Both invite paths lock the email when explicitly requested — the
  // backend enforces that the registered address matches the one the
  // invitation was issued to, so letting the user edit it just
  // produces a guaranteed validation error.
  const lockEmail =
    searchParams.get("lockEmail") === "1" &&
    Boolean(organizationInvitationToken || invitationToken);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      displayName: "",
      email: prefilledEmail,
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});

      if (value.password !== value.confirmPassword) {
        setFieldErrors({ confirmPassword: t("mismatch") });
        return;
      }

      const parsed = zRegisterRequest.safeParse({
        displayName: value.displayName,
        email: value.email,
        password: value.password,
        invitationToken,
        organizationInvitationToken,
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

      try {
        await register(parsed.data);
        setRegisteredEmail(parsed.data.email);
      } catch (error) {
        setFieldErrors(mapProblemToFieldErrors(error as ProblemDetails));
      }
    },
  });

  if (registrationMode === "Disabled") {
    return <RegisterMessage title={t("closed.title")} />;
  }

  if (
    registrationMode === "InviteOnly" &&
    !invitationToken &&
    !organizationInvitationToken
  ) {
    return (
      <RegisterMessage
        title={t("inviteOnly.title")}
        description={t("inviteOnly.description")}
      />
    );
  }

  if (registeredEmail) {
    return (
      <CheckEmailMessage
        email={registeredEmail}
        onResend={async () => {
          try {
            await resendEmailConfirmation(registeredEmail);
          } catch {
            // handleProblem already surfaced a toast.
          }
        }}
      />
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {invitationToken || organizationInvitationToken
              ? t("titleInvited")
              : t("title")}
          </CardTitle>
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
            <FieldGroup>
              <FormInput
                form={form}
                name="displayName"
                label={t("displayName")}
                error={fieldErrors.displayName}
                autoComplete="name"
              />
              <FormInput
                form={form}
                name="email"
                label={t("email")}
                error={fieldErrors.email}
                type="email"
                autoComplete="email"
                readOnly={lockEmail}
              />
              <FormInput
                form={form}
                name="password"
                label={t("password")}
                error={fieldErrors.password}
                type="password"
                autoComplete="new-password"
              />
              <FormInput
                form={form}
                name="confirmPassword"
                label={t("confirmPassword")}
                error={fieldErrors.confirmPassword}
                type="password"
                autoComplete="new-password"
              />
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

            <p className="text-center text-xs text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link
                href="/login"
                className="text-foreground underline-offset-4 hover:underline"
              >
                {t("signIn")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export function RegisterShell() {
  const t = useTranslations("auth.register");
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

function CheckEmailMessage({
  email,
  onResend,
}: {
  email: string;
  onResend: () => Promise<void>;
}) {
  const t = useTranslations("auth.register.checkEmail");
  const [isResending, setIsResending] = useState(false);

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <MailCheckIcon className="mb-2 size-5 text-muted-foreground" />
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t.rich("body", {
              email,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            disabled={isResending}
            onClick={async () => {
              setIsResending(true);
              try {
                await onResend();
              } finally {
                setIsResending(false);
              }
            }}
          >
            {isResending ? t("resending") : t("resend")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("alreadyConfirmed")}{" "}
            <Link
              href="/login"
              className="text-foreground underline-offset-4 hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function RegisterMessage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const t = useTranslations("auth.register.closed");
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <LockIcon className="mb-2 size-5 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description ?? t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className="inline-flex h-8 w-full items-center justify-center border border-border px-2.5 text-xs font-medium hover:bg-muted"
          >
            {t("back")}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

function FormInput({
  form,
  name,
  label,
  error,
  type = "text",
  autoComplete,
  readOnly,
}: {
  form: {
    Field: React.ComponentType<{
      name: "displayName" | "email" | "password" | "confirmPassword";
      children: (field: {
        name: string;
        state: { value: string };
        handleBlur: () => void;
        handleChange: (value: string) => void;
      }) => ReactNode;
    }>;
  };
  name: "displayName" | "email" | "password" | "confirmPassword";
  label: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  readOnly?: boolean;
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <Field>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input
            id={field.name}
            type={type}
            autoComplete={autoComplete}
            value={field.state.value}
            aria-invalid={Boolean(error)}
            readOnly={readOnly}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
          <FieldError>{error}</FieldError>
        </Field>
      )}
    </form.Field>
  );
}
