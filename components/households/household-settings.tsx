"use client";

import { useTranslations } from "next-intl";

import { DeleteHouseholdDialog } from "@/components/households/delete-household-dialog";
import { EditHouseholdForm } from "@/components/households/edit-household-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { HOUSEHOLD_PERMISSION } from "@/lib/household-permission-strings";
import { useCanInActiveHousehold } from "@/lib/active-household-permissions";

/**
 * Household settings page.
 *
 * Two surfaces gated by scoped permissions:
 *
 * - Update (name + slug) → `households.households.write`
 * - Delete → `households.households.delete`
 *
 * Members with neither permission see a friendly empty state rather than
 * a blank page. Platform admins acting under override won't have a
 * membership in /my and so won't have scoped permissions either —
 * intentional: their reads succeed but writes flow through the same
 * permission strings the backend enforces.
 */
export function HouseholdSettings() {
  const t = useTranslations("households.settings");
  const canUpdate = useCanInActiveHousehold(HOUSEHOLD_PERMISSION.HouseholdWrite);
  const canDelete = useCanInActiveHousehold(HOUSEHOLD_PERMISSION.HouseholdDelete);

  if (!canUpdate && !canDelete) {
    return (
      <Empty>
        <EmptyTitle>{t("noAccess.title")}</EmptyTitle>
        <EmptyDescription>{t("noAccess.description")}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4">
      {canUpdate ? <EditHouseholdForm /> : null}
      {canDelete ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("dangerZone.title")}
            </CardTitle>
            <CardDescription>{t("dangerZone.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteHouseholdDialog />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
