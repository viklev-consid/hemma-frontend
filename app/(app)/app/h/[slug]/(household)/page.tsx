import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HouseholdOverview } from "@/components/households/household-overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.households");
  return { title: t("overview") };
}

export default function HouseholdOverviewPage() {
  return <HouseholdOverview />;
}
