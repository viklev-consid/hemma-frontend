"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { PROPERTY_PERMISSION } from "@/lib/household-permission-strings";
import { isPlatformOverride } from "@/lib/household-access-mode";
import { useHousehold } from "@/lib/household-context";
import { useHasHouseholdPermission } from "@/lib/household-permissions";

type PropertyShellProps = {
  children: ReactNode;
};

/**
 * Property shell: the read-permission gate for the property section.
 *
 * Unlike Economy — which gates on a first-run `GET /v1/economy/settings`
 * discriminator — Property has no setup/initialization concept, so the only
 * gate is the scoped read permission. Centralizing it here means later phases'
 * read views don't each repeat the check; write affordances still gate
 * separately on `PROPERTY_PERMISSION.Write` via `useCanWriteProperty`.
 *
 * `householdId` and `accessMode` come from the household shell context. A
 * PlatformOverride admin isn't in `/v1/households/my`, so the raw permission
 * lookup would deny them — we let them through on `accessMode` (the backend
 * remains the real gate). The household layout prefetches `/my`, so for
 * members the permission resolves on first paint without a flash.
 */
export function PropertyShell({ children }: PropertyShellProps) {
  const t = useTranslations("property.shell");
  const { householdId, accessMode } = useHousehold();
  const canRead = useHasHouseholdPermission(
    householdId,
    PROPERTY_PERMISSION.Read,
  );

  if (!isPlatformOverride(accessMode) && !canRead) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-center">
        <div className="grid gap-1">
          <p className="text-sm font-medium">{t("noAccess.title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("noAccess.description")}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
