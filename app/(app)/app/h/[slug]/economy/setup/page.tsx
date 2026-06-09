import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EconomySetupWizard } from "@/components/economy/economy-setup-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("setup") };
}

export default async function EconomySetupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EconomySetupWizard slug={slug} />;
}
