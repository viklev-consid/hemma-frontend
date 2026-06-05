"use client";

import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { mapProblemToFieldErrors, type ProblemDetails } from "@/api/problems";
import { AvatarUploader } from "@/components/avatar-uploader";
import { useAuth } from "@/components/auth-provider";
import { fetchJson } from "@/components/settings/client-fetch";
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

export function ProfileSettingsForm() {
  const t = useTranslations("settingsForms.profile");
  const tCommon = useTranslations("common.actions");
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const form = useForm({
    defaultValues: {
      displayName: currentUser?.displayName ?? "",
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      try {
        await fetchJson<unknown>("/api/proxy/v1/users/me/profile", {
          method: "PATCH",
          body: JSON.stringify({ displayName: value.displayName }),
        });
        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        toast.success(t("saved"));
      } catch (error) {
        setFieldErrors(mapProblemToFieldErrors(error as ProblemDetails));
      }
    },
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (!form.state.isDirty) {
      form.reset({
        displayName: currentUser.displayName,
      });
    }
  }, [currentUser, form]);

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
          {currentUser ? <AvatarUploader user={currentUser} /> : null}
          <FieldGroup>
            <form.Field name="displayName">
              {(field) => (
                <Field data-invalid={Boolean(fieldErrors.displayName)}>
                  <FieldLabel htmlFor={field.name}>
                    {t("displayName")}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors.displayName)}
                    />
                    <FieldError>{fieldErrors.displayName}</FieldError>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
            <Field>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <FieldContent>
                <Input id="email" value={currentUser?.email ?? ""} readOnly />
                <FieldDescription>{t("emailHint")}</FieldDescription>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>{t("role")}</FieldLabel>
              <FieldContent>
                <Badge variant="secondary" className="w-fit">
                  {currentUser?.role ?? t("roleFallback")}
                </Badge>
              </FieldContent>
            </Field>
          </FieldGroup>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button className="w-fit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? tCommon("saving") : tCommon("save")}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  );
}
