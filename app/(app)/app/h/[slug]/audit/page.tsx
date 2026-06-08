import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HouseholdAuditTable } from "@/components/households/household-audit-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.households");
  return { title: t("audit") };
}

export default function HouseholdAuditPage() {
  return <HouseholdAuditTable />;
}
