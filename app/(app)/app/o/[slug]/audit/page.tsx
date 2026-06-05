import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OrgAuditTable } from "@/components/organizations/org-audit-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.organizations");
  return { title: t("audit") };
}

export default function OrgAuditPage() {
  return <OrgAuditTable />;
}
