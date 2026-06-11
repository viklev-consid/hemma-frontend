import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.property");
  return { title: t("logbook") };
}

/**
 * Logbook landing — placeholder for Phase 1.
 *
 * The sidebar links here from day one, so the route must resolve rather than
 * 404. Phase 6 replaces this with the history list + entry form.
 */
export default async function PropertyLogbookPage() {
  const t = await getTranslations("property.logbook");

  return (
    <div className="grid gap-1">
      <h1 className="text-lg font-semibold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );
}
