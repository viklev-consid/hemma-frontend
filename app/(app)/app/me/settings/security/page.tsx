import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SecuritySettings } from "@/components/settings/security-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.settings");
  return { title: t("security") };
}

export default function SecuritySettingsPage() {
  return <SecuritySettings />;
}
