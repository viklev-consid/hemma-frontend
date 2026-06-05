"use client";

import { ShieldAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isPlatformOverride } from "@/lib/org-access-mode";

/**
 * Surfaces `accessMode === "PlatformOverride"` in the org shell header
 * — but only when the caller is *not* also a member of this org.
 *
 * Why the membership check: the backend reports PlatformOverride whenever
 * the override permission was the path taken, even if the caller is also
 * a regular member. Showing the badge in that case is noise — the user's
 * membership already covers them. The badge is meant to be the
 * "you're operating outside your normal membership" reminder, so we gate
 * it on `isMember === false`.
 *
 * Platform admins acting without membership won't appear in /my, owner
 * counts, or the member list. The badge keeps them aware they're a guest.
 */
export function AccessModeBadge({
  accessMode,
  isMember,
}: {
  accessMode: string;
  isMember: boolean;
}) {
  const t = useTranslations("organizations.shell.accessMode");

  if (!isPlatformOverride(accessMode) || isMember) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant="destructive" className="gap-1">
            <ShieldAlertIcon className="size-3" />
            <span>{t("platformOverrideLabel")}</span>
          </Badge>
        }
      />
      <TooltipContent>{t("platformOverrideDescription")}</TooltipContent>
    </Tooltip>
  );
}
