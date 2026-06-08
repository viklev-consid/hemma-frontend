"use client";

import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHousehold } from "@/lib/household-context";

/**
 * Minimal household landing page. Members, invitations, settings live in
 * sibling routes; this surface is intentionally low-density in v1 — it
 * exists so deep links to `/h/:slug` resolve to something coherent
 * rather than 404 or auto-redirect.
 */
export function HouseholdOverview() {
  const t = useTranslations("households.overview");
  const household = useHousehold();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title", { name: household.name })}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              {t("slugLabel")}
            </dt>
            <dd className="font-mono">/{household.slug}</dd>
          </div>
          {household.role ? (
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">
                {t("roleLabel")}
              </dt>
              <dd>{household.role}</dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}
