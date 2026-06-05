"use client";

import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOrg } from "@/lib/org-context";

/**
 * Minimal org landing page. Members, invitations, settings live in
 * sibling routes; this surface is intentionally low-density in v1 — it
 * exists so deep links to `/o/:slug` resolve to something coherent
 * rather than 404 or auto-redirect.
 */
export function OrgOverview() {
  const t = useTranslations("organizations.overview");
  const org = useOrg();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title", { name: org.name })}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              {t("slugLabel")}
            </dt>
            <dd className="font-mono">/{org.slug}</dd>
          </div>
          {org.role ? (
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">
                {t("roleLabel")}
              </dt>
              <dd>{org.role}</dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}
