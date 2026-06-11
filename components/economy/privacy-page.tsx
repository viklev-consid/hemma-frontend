"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ShieldAlertIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
import { useHousehold } from "@/lib/household-context";

/**
 * Economy privacy disclosure + the self-scoped GDPR export.
 *
 * Accuracy-first surface (Phase 7): every claim is true against the backend as
 * shipped. The encryption line is a manual release-time copy switch — field
 * encryption is NOT live for Economy, so the "not encrypted yet" wording is the
 * true variant (one i18n key: `economy.privacy.encryption.status`). Re-confirm
 * it with the backend every release until field encryption lands.
 *
 * Membership-gated (owner and member both see it and export their own data) —
 * no `<Can>` gate. Cross-links to `/me/settings/data` for account-level export
 * and erasure; it does NOT duplicate erasure.
 */
export function PrivacyPage() {
  const t = useTranslations("economy.privacy");

  return (
    <div className="grid max-w-2xl gap-6">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </header>

      <Alert variant="destructive">
        <ShieldAlertIcon />
        <AlertTitle>{t("encryption.title")}</AlertTitle>
        <AlertDescription>{t("encryption.status")}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t("scope.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("scope.body")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("erasure.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <p className="text-sm text-muted-foreground">{t("erasure.body")}</p>
          <p className="text-xs text-muted-foreground">
            {t("erasure.accountNote")}
          </p>
        </CardContent>
      </Card>

      <ExportEconomyDataCard />

      <Card>
        <CardHeader>
          <CardTitle>{t("links.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <RelatedLink
            href="/app/me/settings/data"
            icon={<FileTextIcon className="size-4 text-muted-foreground" />}
            label={t("links.privacyPolicy")}
            hint={t("links.privacyPolicyHint")}
          />
          <RelatedLink
            href="/app/me/settings/data"
            icon={<Trash2Icon className="size-4 text-muted-foreground" />}
            label={t("links.personalData")}
            hint={t("links.personalDataHint")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RelatedLink({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-3 rounded-md border p-3 hover:bg-accent"
    >
      <span className="flex items-start gap-2">
        {icon}
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </span>
      </span>
      <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/**
 * The self-scoped economy GDPR export.
 *
 * On-demand and uncached by design (sensitive personal data the user explicitly
 * asks for): a raw `GET` through the proxy, streamed straight to a `Blob`
 * download — never a `useQuery`, never prefetched, never left in the React
 * Query cache. Mirrors `downloadPersonalData()` in `data-settings.tsx`. The
 * payload is self-scoped to the caller (`payerId == currentUserId`); a fresh
 * household returns `200` with `data.transactions: []`, which still downloads a
 * valid file — not an error.
 */
function ExportEconomyDataCard() {
  const t = useTranslations("economy.privacy.export");
  const { householdId, slug } = useHousehold();
  const [isExporting, setIsExporting] = useState(false);

  async function exportEconomyData() {
    setIsExporting(true);
    try {
      const data = await fetchJson<unknown>(
        `/api/proxy/v1/economy/gdpr/export?householdId=${encodeURIComponent(householdId)}`,
      );
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `hemma-economy-data-${slug}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t("done"));
    } catch {
      // fetchJson already surfaces the ProblemDetails toast; add a generic
      // fallback so a non-ProblemDetails failure still tells the user.
      toast.error(t("error"));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void exportEconomyData();
          }}
          disabled={isExporting}
        >
          <DownloadIcon />
          {isExporting ? t("submitting") : t("submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
