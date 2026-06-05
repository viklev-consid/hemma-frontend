"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2Icon, LoaderCircleIcon, XCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { fetchJson } from "@/components/settings/client-fetch";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Status = "idle" | "loading" | "success" | "error";

export function ConfirmEmailChangeContent() {
  const t = useTranslations("settingsForms.confirmEmailChange");
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<Status>(
    initialToken ? "loading" : "idle",
  );
  const attempted = useRef(false);

  useEffect(() => {
    if (!initialToken || attempted.current) {
      return;
    }
    attempted.current = true;
    void confirm(initialToken);
  }, [initialToken]);

  async function confirm(value: string) {
    setStatus("loading");
    try {
      await fetchJson("/api/proxy/v1/users/me/email/confirm", {
        method: "POST",
        body: JSON.stringify({ token: value }),
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const isLoading = status === "loading";
  const isConfirmed = status === "success";
  const isError = status === "error";

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
          {isLoading ? (
            <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
          ) : isConfirmed ? (
            <CheckCircle2Icon className="size-6 text-emerald-600" />
          ) : isError ? (
            <XCircleIcon className="size-6 text-destructive" />
          ) : (
            <CheckCircle2Icon className="size-6 text-muted-foreground" />
          )}
        </div>
        <CardTitle>
          {isLoading
            ? t("loading.title")
            : isConfirmed
              ? t("success.title")
              : isError
                ? t("error.title")
                : t("idle.title")}
        </CardTitle>
        <CardDescription>
          {isLoading
            ? t("loading.description")
            : isConfirmed
              ? t("success.description")
              : isError
                ? t("error.description")
                : t("idle.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isConfirmed || isError ? (
          <Link
            href={isConfirmed ? "/app" : "/app/me/settings/email"}
            className={buttonVariants()}
          >
            {isConfirmed ? t("success.cta") : t("error.cta")}
          </Link>
        ) : (
          !isLoading && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (token.trim()) {
                  void confirm(token.trim());
                }
              }}
            >
              <Field>
                <FieldLabel htmlFor="change-token">
                  {t("tokenLabel")}
                </FieldLabel>
                <Input
                  id="change-token"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder={t("tokenPlaceholder")}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={!token.trim()}>
                {t("submit")}
              </Button>
            </form>
          )
        )}
      </CardContent>
    </Card>
  );
}
