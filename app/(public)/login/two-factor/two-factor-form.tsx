"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";

import { mapProblemToFieldErrors, type ProblemDetails } from "@/api/problems";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  getTwoFactorChallengeServerSnapshot,
  getTwoFactorChallengeSnapshot,
  subscribeTwoFactorChallenge,
  type TwoFactorChallenge,
} from "@/lib/two-factor-challenge";

const TOTP_LENGTH = 6;

type Mode = "totp" | "recovery";

function useChallenge(): TwoFactorChallenge | null {
  // useSyncExternalStore handles SSR cleanly: server snapshot is null (matches
  // the static HTML), client snapshot reads sessionStorage post-hydration.
  return useSyncExternalStore(
    subscribeTwoFactorChallenge,
    getTwoFactorChallengeSnapshot,
    getTwoFactorChallengeServerSnapshot,
  );
}

function useHasMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-shot post-hydration flag; tells callers it's now safe to render client-only content
    setMounted(true);
  }, []);
  return mounted;
}

function NoChallengeShell() {
  const t = useTranslations("auth.twoFactor");
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t("noChallenge")}</p>
        <Link
          href="/login"
          className="text-sm underline underline-offset-4 hover:text-foreground"
        >
          {t("backToSignIn")}
        </Link>
      </div>
    </main>
  );
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const t = useTranslations("auth.twoFactor");
  const target = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining(target - Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (remaining <= 0) {
    return (
      <p className="text-xs text-destructive">
        {t("expired")}{" "}
        <Link href="/login" className="underline-offset-4 hover:underline">
          {t("startOver")}
        </Link>
        .
      </p>
    );
  }

  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return (
    <p className="text-xs text-muted-foreground">
      {t("expiresIn", { minutes, seconds })}
    </p>
  );
}

export function TwoFactorForm() {
  const t = useTranslations("auth.twoFactor");
  const { completeTwoFactorLogin } = useAuth();
  const challenge = useChallenge();
  const mounted = useHasMounted();

  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function reset() {
    setCode("");
    setFieldErrors({});
  }

  async function submit(value: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFieldErrors({});

    try {
      await completeTwoFactorLogin(value);
    } catch (error) {
      const mapped = mapProblemToFieldErrors(error as ProblemDetails);
      setFieldErrors({
        code: mapped.code ?? (error as ProblemDetails)?.detail ?? "",
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (mounted && !challenge) {
    return <NoChallengeShell />;
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {mode === "totp" ? t("totp.title") : t("recovery.title")}
          </CardTitle>
          <CardDescription>
            {mode === "totp"
              ? t("totp.description")
              : t("recovery.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!code || submitting) return;
              void submit(code);
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="code">
                  {mode === "totp"
                    ? t("totp.codeLabel")
                    : t("recovery.codeLabel")}
                </FieldLabel>
                {mode === "totp" ? (
                  <InputOTP
                    id="code"
                    maxLength={TOTP_LENGTH}
                    autoFocus
                    value={code}
                    onChange={(next) => setCode(next)}
                    onComplete={(complete) => {
                      if (!submitting) void submit(complete);
                    }}
                    aria-invalid={Boolean(fieldErrors.code)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: TOTP_LENGTH }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                ) : (
                  <Input
                    id="code"
                    autoFocus
                    autoComplete="one-time-code"
                    value={code}
                    aria-invalid={Boolean(fieldErrors.code)}
                    onChange={(event) => setCode(event.target.value.trim())}
                    placeholder={t("recovery.placeholder")}
                  />
                )}
                <FieldError>{fieldErrors.code}</FieldError>
              </Field>

              {challenge ? (
                <ExpiryCountdown expiresAt={challenge.expiresAt} />
              ) : (
                <p className="text-xs text-muted-foreground">{t("loading")}</p>
              )}
            </FieldGroup>

            <Button
              type="submit"
              className="w-full"
              disabled={!code || submitting}
            >
              {submitting ? t("submitting") : t("submit")}
            </Button>

            <div className="space-y-2 text-center">
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => {
                  setMode(mode === "totp" ? "recovery" : "totp");
                  reset();
                }}
              >
                {mode === "totp"
                  ? t("totp.switchToRecovery")
                  : t("recovery.switchToTotp")}
              </button>
              <div>
                <Link
                  href="/login"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t("backToSignIn")}
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
