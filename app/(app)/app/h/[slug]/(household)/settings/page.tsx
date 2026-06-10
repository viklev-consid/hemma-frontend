import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HouseholdSettings } from "@/components/households/household-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.households");
  return { title: t("settings") };
}

export default function HouseholdSettingsPage() {
  return <HouseholdSettings />;
}
