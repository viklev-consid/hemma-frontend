"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * One-time display of a freshly-minted invitation raw token.
 *
 * The backend hashes the token at rest — once the user closes this panel,
 * the value is unrecoverable. Re-issuing requires revoking + creating a
 * new invite. The copy buttons and the "you won't see this again" warning
 * are intentionally prominent.
 */
export function RawTokenPanel({
  rawToken,
  inviteUrl,
}: {
  rawToken: string;
  inviteUrl: string;
}) {
  const t = useTranslations("organizations.invitations.rawToken");
  const [copied, setCopied] = useState<"token" | "url" | null>(null);

  async function copy(value: string, kind: "token" | "url") {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      // Reset the affordance after a moment so the icon flip is visible.
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard write can fail in insecure contexts or sandboxed iframes;
      // the textarea remains selectable as a fallback.
    }
  }

  return (
    <div className="grid gap-3">
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>{t("warningTitle")}</AlertTitle>
        <AlertDescription>{t("warningBody")}</AlertDescription>
      </Alert>

      <div className="grid gap-1.5">
        <label
          htmlFor="invite-url"
          className="text-xs font-medium text-muted-foreground"
        >
          {t("urlLabel")}
        </label>
        <div className="flex gap-2">
          <input
            id="invite-url"
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-none border border-input bg-background px-2 py-1.5 font-mono text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copy(inviteUrl, "url")}
            aria-label={t("copyUrl")}
          >
            {copied === "url" ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="raw-token"
          className="text-xs font-medium text-muted-foreground"
        >
          {t("tokenLabel")}
        </label>
        <div className="flex gap-2">
          <input
            id="raw-token"
            readOnly
            value={rawToken}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-none border border-input bg-background px-2 py-1.5 font-mono text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copy(rawToken, "token")}
            aria-label={t("copyToken")}
          >
            {copied === "token" ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
      </div>
    </div>
  );
}
