"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  handleProblem,
  problemFromResponse,
  type ProblemDetails,
} from "@/api/problems";
import { useAuth } from "@/components/auth-provider";
import { fetchJson } from "@/components/settings/client-fetch";
import { LegalAcceptancesCard } from "@/components/settings/legal-acceptances-card";
import { LegalPendingCard } from "@/components/settings/legal-pending-card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  extractBlockingHouseholds,
  isHouseholdError,
  HOUSEHOLD_ERRORS,
  type BlockingHousehold,
} from "@/lib/household-errors";

export function DataSettings() {
  const t = useTranslations("settingsForms.data");
  const tCommon = useTranslations("common.actions");
  const { currentUser } = useAuth();
  const { replace } = useRouter();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // When the backend rejects deletion because the user is the sole owner
  // of one or more households, we surface them here and switch the
  // confirm dialog to a remediation view. Cleared on Cancel / dialog
  // close so a retry starts from a blank slate.
  const [blockingHouseholds, setBlockingHouseholds] = useState<
    BlockingHousehold[] | null
  >(null);
  const email = currentUser?.email ?? "";
  const canDelete = confirmEmail === email;

  async function downloadPersonalData() {
    setIsExporting(true);
    try {
      const data = await fetchJson<unknown>(
        "/api/proxy/v1/users/me/personal-data",
      );
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "hemma-personal-data.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  async function deleteAccount() {
    setIsDeleting(true);
    try {
      // Bypass fetchJson here so we can inspect the problem ourselves
      // before its toast fires. The UserErasureBlocked case is a hand-
      // off to remediation, not a generic error to bark at the user.
      const response = await fetch("/api/proxy/v1/users/me", {
        method: "DELETE",
      });

      if (response.ok) {
        await fetch("/api/auth/logout", { method: "POST" });
        replace("/goodbye");
        return;
      }

      const problem = (await problemFromResponse(response)) as ProblemDetails;

      // The Households module attaches a structured
      // blockingHouseholds list to UserErasureBlocked. Each entry
      // carries `isSoleOwner` so the remediation panel can flag the
      // hard blockers distinctly.
      if (isHouseholdError(problem, HOUSEHOLD_ERRORS.UserErasureBlocked)) {
        setBlockingHouseholds(extractBlockingHouseholds(problem));
        return;
      }

      handleProblem(problem);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <LegalPendingCard />
      <LegalAcceptancesCard />
      <Card>
        <CardHeader>
          <CardTitle>{t("export.title")}</CardTitle>
          <CardDescription>{t("export.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void downloadPersonalData();
            }}
            disabled={isExporting}
          >
            <DownloadIcon />
            {isExporting ? t("export.submitting") : t("export.submit")}
          </Button>
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">
            {t("delete.title")}
          </CardTitle>
          <CardDescription>{t("delete.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog
            onOpenChange={(open) => {
              if (!open) {
                // Reset both the email-confirm field and any remediation
                // state so reopening starts from scratch.
                setConfirmEmail("");
                setBlockingHouseholds(null);
              }
            }}
          >
            <AlertDialogTrigger
              render={
                <Button type="button" variant="destructive">
                  <Trash2Icon />
                  {t("delete.trigger")}
                </Button>
              }
            />
            <AlertDialogContent>
              {blockingHouseholds ? (
                <BlockingHouseholdsRemediation
                  households={blockingHouseholds}
                  onClose={() => setBlockingHouseholds(null)}
                />
              ) : (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                      {t("delete.confirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("delete.confirmDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Field>
                    <FieldLabel htmlFor="delete-confirm-email">
                      {t("delete.confirmLabel")}
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="delete-confirm-email"
                        value={confirmEmail}
                        onChange={(event) =>
                          setConfirmEmail(event.target.value)
                        }
                      />
                      <FieldDescription>{email}</FieldDescription>
                    </FieldContent>
                  </Field>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => {
                        setConfirmEmail("");
                      }}
                    >
                      {tCommon("cancel")}
                    </AlertDialogCancel>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!canDelete || isDeleting}
                      onClick={() => {
                        if (!canDelete) {
                          toast.error(t("delete.emailMismatch"));
                          return;
                        }
                        void deleteAccount();
                      }}
                    >
                      {isDeleting ? t("delete.submitting") : t("delete.submit")}
                    </Button>
                  </AlertDialogFooter>
                </>
              )}
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Remediation panel shown when account deletion is refused because the
 * user is the sole Owner of one or more households.
 *
 * Each row offers two deep links:
 * - "Manage members" → /h/:slug/members so they can transfer ownership.
 * - "Delete household" → /h/:slug/settings where the Danger zone
 *   lives. Deleting all blocking households (or transferring ownership)
 *   unblocks the account-deletion path.
 *
 * We intentionally don't auto-retry the deletion after a successful
 * remediation — the user should explicitly come back and click Delete
 * again so they reconfirm the irreversible step.
 */
function BlockingHouseholdsRemediation({
  households,
  onClose,
}: {
  households: BlockingHousehold[];
  onClose: () => void;
}) {
  const t = useTranslations("settingsForms.data.delete.blocking");
  const tCommon = useTranslations("common.actions");

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("title")}</AlertDialogTitle>
        <AlertDialogDescription>{t("description")}</AlertDialogDescription>
      </AlertDialogHeader>
      <ul className="grid gap-2 py-2">
        {households.map((household) => (
          <li
            key={household.householdId}
            className="grid gap-2 rounded-md border p-3 sm:flex sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2">
              <Building2Icon className="size-4 text-muted-foreground" />
              <div className="grid">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{household.name}</span>
                  {household.isSoleOwner ? (
                    <Badge variant="destructive">{t("soleOwnerBadge")}</Badge>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  /{household.slug}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/app/h/${household.slug}/members`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
                onClick={onClose}
              >
                {t("transferCta")}
                <ExternalLinkIcon />
              </Link>
              <Link
                href={`/app/h/${household.slug}/settings`}
                className={buttonVariants({
                  size: "sm",
                  variant: "destructive",
                })}
                onClick={onClose}
              >
                {t("deleteHouseholdCta")}
                <ExternalLinkIcon />
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose}>
          {tCommon("close")}
        </AlertDialogCancel>
      </AlertDialogFooter>
    </>
  );
}
