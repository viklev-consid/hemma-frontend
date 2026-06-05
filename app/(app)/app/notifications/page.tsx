import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { NotificationsPageClient } from "@/components/settings/notifications-page-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app");
  return { title: t("notifications") };
}

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsPageClient />
    </Suspense>
  );
}
