import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DataSettings } from "@/components/settings/data-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.settings");
  return { title: t("data") };
}

export default function DataSettingsPage() {
  return <DataSettings />;
}
