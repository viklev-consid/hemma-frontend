import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.property");
  return { title: t("maintenance") };
}

/**
 * Maintenance landing — placeholder for Phase 1.
 *
 * The sidebar links here from day one, so the route must resolve rather than
 * 404. Phase 5 replaces this with the plans + upcoming-occurrences surfaces.
 */
export default async function PropertyMaintenancePage() {
  const t = await getTranslations("property.maintenance");

  return (
    <div className="grid gap-1">
      <h1 className="text-lg font-semibold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );
}
