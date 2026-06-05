"use client";

import { useTranslations } from "next-intl";

import { DeleteOrgDialog } from "@/components/organizations/delete-org-dialog";
import { EditOrgForm } from "@/components/organizations/edit-org-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ORG_PERMISSION } from "@/lib/org-permission-strings";
import { useCanInActiveOrg } from "@/lib/active-org-permissions";

/**
 * Org settings page.
 *
 * Two surfaces gated by scoped permissions:
 *
 * - Update (name + slug) → `organizations.organizations.write`
 * - Delete → `organizations.organizations.delete`
 *
 * Members with neither permission see a friendly empty state rather than
 * a blank page. Platform admins acting under override won't have a
 * membership in /my and so won't have scoped permissions either —
 * intentional: their reads succeed but writes flow through the same
 * permission strings the backend enforces.
 */
export function OrgSettings() {
  const t = useTranslations("organizations.settings");
  const canUpdate = useCanInActiveOrg(ORG_PERMISSION.OrgWrite);
  const canDelete = useCanInActiveOrg(ORG_PERMISSION.OrgDelete);

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
      {canUpdate ? <EditOrgForm /> : null}
      {canDelete ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("dangerZone.title")}
            </CardTitle>
            <CardDescription>{t("dangerZone.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteOrgDialog />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
