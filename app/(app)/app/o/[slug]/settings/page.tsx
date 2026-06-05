import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OrgSettings } from "@/components/organizations/org-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.organizations");
  return { title: t("settings") };
}

export default function OrgSettingsPage() {
  return <OrgSettings />;
}
