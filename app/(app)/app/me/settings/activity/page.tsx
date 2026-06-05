import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ActivityFeed } from "@/components/activity-feed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.settings");
  return { title: t("activity") };
}

export default async function ActivityPage() {
  const t = await getTranslations("settings.activity");
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Suspense>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}
