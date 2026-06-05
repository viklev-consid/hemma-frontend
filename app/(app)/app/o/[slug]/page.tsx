import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OrgOverview } from "@/components/organizations/org-overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.organizations");
  return { title: t("overview") };
}

export default function OrgOverviewPage() {
  return <OrgOverview />;
}
