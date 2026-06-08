"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, DownloadIcon, ShieldIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type {
  ConfirmTotpResponse,
  RegenerateRecoveryCodesResponse,
  SetupTotpResponse,
} from "@/api/generated";
import { mapProblemToFieldErrors, type ProblemDetails } from "@/api/problems";
import { useCurrentUser } from "@/components/auth-provider";
import { fetchJson, fieldMessage } from "@/components/settings/client-fetch";
import { currentUserQueryKey } from "@/lib/auth-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { QRCode, QRCodeCanvas } from "@/components/ui/qr-code";
import { Skeleton } from "@/components/ui/skeleton";

const TOTP_LENGTH = 6;

type SetupStep = "scan" | "confirm" | "codes";

function copyToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }
  void navigator.clipboard.writeText(text);
}

function downloadCodes(codes: string[]) {
  const blob = new Blob([codes.join("\n") + "\n"], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hemma-recovery-codes.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function RecoveryCodeList({ codes }: { codes: string[] }) {
  const t = useTranslations("settingsForms.security.codes");
  const joined = codes.join("\n");
  return (
    <div className="space-y-3">
      <ul
        aria-live="polite"
        className="rounded-md border bg-muted/40 p-3 font-mono text-sm leading-6 tracking-wider"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            copyToClipboard(joined);
            toast.success(t("copied"));
          }}
        >
          <CopyIcon className="size-4" /> {t("copyAll")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadCodes(codes)}
        >
          <DownloadIcon className="size-4" /> {t("downloadTxt")}
        </Button>
      </div>
    </div>
  );
}

function SecuritySettingsSkeleton() {
  const t = useTranslations("settingsForms.security");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("loadingTitle")}</CardTitle>
        <CardDescription>{t("loadingDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-9 w-40" />
      </CardContent>
    </Card>
  );
}

export function SecuritySettings() {
  const currentUser = useCurrentUser();

  if (!currentUser) {
    return <SecuritySettingsSkeleton />;
  }

  return currentUser.twoFactorEnabled ? <EnabledPanel /> : <DisabledPanel />;
}

function DisabledPanel() {
  const t = useTranslations("settingsForms.security.disabled");
  const queryClient = useQueryClient();
  const [step, setStep] = useState<SetupStep | null>(null);
  const [setup, setSetup] = useState<SetupTotpResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

  async function startSetup() {
    setStarting(true);
    try {
      const response = await fetchJson<SetupTotpResponse>(
        "/api/proxy/v1/users/me/2fa/totp/setup",
        { method: "POST" },
      );
      setSetup(response);
      setStep("scan");
    } finally {
      setStarting(false);
    }
  }

  function finishConfirm(codes: string[]) {
    setRecoveryCodes(codes);
    setStep("codes");
  }

  if (step === "scan" && setup) {
    return (
      <SetupScanStep
        setup={setup}
        onContinue={() => setStep("confirm")}
        onCancel={() => {
          setSetup(null);
          setStep(null);
        }}
      />
    );
  }

  if (step === "confirm") {
    return (
      <SetupConfirmStep
        onBack={() => setStep("scan")}
        onConfirmed={finishConfirm}
      />
    );
  }

  if (step === "codes") {
    return (
      <SetupCodesStep
        codes={recoveryCodes}
        onDone={async () => {
          // Invalidate AFTER acknowledgement so the parent doesn't swap to
          // EnabledPanel and unmount this screen while codes are still visible.
          setSetup(null);
          setRecoveryCodes([]);
          setStep(null);
          await queryClient.invalidateQueries({
            queryKey: currentUserQueryKey,
          });
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldIcon className="size-4 text-muted-foreground" />
          {t("status")}
        </div>
        <p className="text-sm text-muted-foreground">{t("explainer")}</p>
        <Button type="button" onClick={startSetup} disabled={starting}>
          {starting ? t("starting") : t("start")}
        </Button>
      </CardContent>
    </Card>
  );
}

function SetupScanStep({
  setup,
  onContinue,
  onCancel,
}: {
  setup: SetupTotpResponse;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("settingsForms.security.scan");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <QRCode value={setup.otpAuthUri} size={180}>
            <QRCodeCanvas className="rounded-md border bg-white p-2" />
          </QRCode>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("manualPrompt")}</p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                {setup.secret}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  copyToClipboard(setup.secret);
                  toast.success(t("secretCopied"));
                }}
              >
                <CopyIcon className="size-4" />
                <span className="sr-only">{t("copySecret")}</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("back")}
          </Button>
          <Button type="button" onClick={onContinue}>
            {t("continue")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SetupConfirmStep({
  onBack,
  onConfirmed,
}: {
  onBack: () => void;
  onConfirmed: (codes: string[]) => void;
}) {
  const t = useTranslations("settingsForms.security.confirm");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(value: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFieldErrors({});
    try {
      const response = await fetchJson<ConfirmTotpResponse>(
        "/api/proxy/v1/users/me/2fa/totp/confirm",
        {
          method: "POST",
          redirectOnUnauthorized: false,
          body: JSON.stringify({ code: value }),
        },
      );
      onConfirmed(response.recoveryCodes);
    } catch (error) {
      const problem = error as ProblemDetails;
      const mapped = mapProblemToFieldErrors(problem);
      setFieldErrors({
        code: mapped.code ?? fieldMessage(problem, "code", t("wrongCode")),
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === TOTP_LENGTH && !submitting) {
              void submit(code);
            }
          }}
        >
          <Field>
            <FieldLabel htmlFor="totp-confirm">{t("codeLabel")}</FieldLabel>
            <InputOTP
              id="totp-confirm"
              maxLength={TOTP_LENGTH}
              autoFocus
              value={code}
              onChange={(next) => setCode(next)}
              onComplete={(value) => {
                if (!submitting) void submit(value);
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
            <FieldError>{fieldErrors.code}</FieldError>
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              {t("back")}
            </Button>
            <Button
              type="submit"
              disabled={code.length !== TOTP_LENGTH || submitting}
            >
              {submitting ? t("submitting") : t("submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SetupCodesStep({
  codes,
  onDone,
}: {
  codes: string[];
  onDone: () => void;
}) {
  const t = useTranslations("settingsForms.security.codes");
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RecoveryCodeList codes={codes} />
        <label
          htmlFor="recovery-codes-acknowledged"
          className="flex items-center gap-2 text-sm"
        >
          <Checkbox
            id="recovery-codes-acknowledged"
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
          />
          {t("acknowledge")}
        </label>
        <Button type="button" disabled={!acknowledged} onClick={onDone}>
          <CheckIcon className="size-4" /> {t("finish")}
        </Button>
      </CardContent>
    </Card>
  );
}

function EnabledPanel() {
  const tEnabled = useTranslations("settingsForms.security.enabled");
  const tRegen = useTranslations("settingsForms.security.regenerate");
  const tDisable = useTranslations("settingsForms.security.disableCard");
  const queryClient = useQueryClient();
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(
    null,
  );

  if (newRecoveryCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tRegen("result.title")}</CardTitle>
          <CardDescription>{tRegen("result.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RecoveryCodeList codes={newRecoveryCodes} />
          <SaveAcknowledgeButton onDone={() => setNewRecoveryCodes(null)} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{tEnabled("title")}</CardTitle>
          <CardDescription>{tEnabled("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldIcon className="size-4 text-emerald-600" />
            {tEnabled("status")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tRegen("title")}</CardTitle>
          <CardDescription>{tRegen("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRegenerateOpen(true)}
          >
            {tRegen("open")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">
            {tDisable("title")}
          </CardTitle>
          <CardDescription>{tDisable("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDisableOpen(true)}
          >
            {tDisable("open")}
          </Button>
        </CardContent>
      </Card>

      <RegenerateDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        onSuccess={(codes) => {
          setRegenerateOpen(false);
          setNewRecoveryCodes(codes);
        }}
      />

      <DisableDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onSuccess={async () => {
          setDisableOpen(false);
          toast.success(tEnabled("disabledToast"));
          await queryClient.invalidateQueries({
            queryKey: currentUserQueryKey,
          });
        }}
      />
    </div>
  );
}

function SaveAcknowledgeButton({ onDone }: { onDone: () => void }) {
  const t = useTranslations("settingsForms.security.regenerate.result");
  const [ack, setAck] = useState(false);
  return (
    <div className="space-y-3">
      <label
        htmlFor="new-recovery-codes-acknowledged"
        className="flex items-center gap-2 text-sm"
      >
        <Checkbox
          id="new-recovery-codes-acknowledged"
          checked={ack}
          onCheckedChange={(checked) => setAck(checked === true)}
        />
        {t("acknowledge")}
      </label>
      <Button type="button" disabled={!ack} onClick={onDone}>
        {t("finish")}
      </Button>
    </div>
  );
}

type ConfirmFields = {
  currentPassword: string;
  code: string;
};

function ConfirmFieldsForm({
  submitLabel,
  pendingLabel,
  destructive,
  onSubmit,
}: {
  submitLabel: string;
  pendingLabel: string;
  destructive?: boolean;
  onSubmit: (data: ConfirmFields) => Promise<void>;
}) {
  const t = useTranslations("settingsForms.security.credentials");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const canSubmit = password.length > 0 && code.length >= TOTP_LENGTH;

  async function handleSubmit() {
    setSubmitting(true);
    setFieldErrors({});
    try {
      await onSubmit({ currentPassword: password, code });
    } catch (error) {
      const problem = error as ProblemDetails;
      const mapped = mapProblemToFieldErrors(problem);
      // When the backend returns a bare `detail` (no field errors), surface it
      // on the code input — the only "free-text" error path here is "wrong
      // verification code".
      const detailFallback =
        !problem.errors && problem.detail ? problem.detail : "";
      setFieldErrors({
        currentPassword: mapped.currentPassword ?? "",
        code: mapped.code ?? detailFallback,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit && !submitting) void handleSubmit();
      }}
    >
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors.currentPassword)}>
          <FieldLabel htmlFor="security-current-password">
            {t("passwordLabel")}
          </FieldLabel>
          <FieldContent>
            <Input
              id="security-current-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.currentPassword)}
            />
            <FieldError>{fieldErrors.currentPassword}</FieldError>
          </FieldContent>
        </Field>
        <Field data-invalid={Boolean(fieldErrors.code)}>
          <FieldLabel htmlFor="security-code">{t("codeLabel")}</FieldLabel>
          <FieldContent>
            <Input
              id="security-code"
              autoComplete="one-time-code"
              value={code}
              placeholder={t("codePlaceholder")}
              onChange={(event) => setCode(event.target.value.trim())}
              aria-invalid={Boolean(fieldErrors.code)}
            />
            <FieldError>{fieldErrors.code}</FieldError>
          </FieldContent>
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button
          type="submit"
          variant={destructive ? "destructive" : "default"}
          disabled={!canSubmit || submitting}
        >
          {submitting ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RegenerateDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (codes: string[]) => void;
}) {
  const t = useTranslations("settingsForms.security.regenerate");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        <ConfirmFieldsForm
          submitLabel={t("submit")}
          pendingLabel={t("submitting")}
          onSubmit={async (data) => {
            const response = await fetchJson<RegenerateRecoveryCodesResponse>(
              "/api/proxy/v1/users/me/2fa/recovery-codes/regenerate",
              {
                method: "POST",
                redirectOnUnauthorized: false,
                body: JSON.stringify(data),
              },
            );
            onSuccess(response.recoveryCodes);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function DisableDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void> | void;
}) {
  const t = useTranslations("settingsForms.security.disableCard");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        <ConfirmFieldsForm
          submitLabel={t("submit")}
          pendingLabel={t("submitting")}
          destructive
          onSubmit={async (data) => {
            await fetchJson("/api/proxy/v1/users/me/2fa", {
              method: "DELETE",
              redirectOnUnauthorized: false,
              body: JSON.stringify(data),
            });
            await onSuccess();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
