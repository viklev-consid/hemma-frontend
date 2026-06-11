import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.property");
  return { title: t("projects") };
}

/**
 * Projects landing — placeholder for Phase 1.
 *
 * Phase 2 replaces this with the prefetched, filterable project list. For now
 * it confirms the route is reachable inside the property shell and shows an
 * empty state. The layout already warms `listPropertyProjects`, so the Phase 2
 * client list will hydrate without a refetch.
 */
export default async function PropertyProjectsPage() {
  const t = await getTranslations("property.projects");

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="grid place-items-center gap-1 border border-dashed p-10 text-center">
        <p className="text-sm font-medium">{t("empty.title")}</p>
        <p className="text-xs text-muted-foreground">
          {t("empty.description")}
        </p>
      </div>
    </div>
  );
}
