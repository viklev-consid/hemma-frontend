import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EmailSettingsForm } from "@/components/settings/email-settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.settings");
  return { title: t("email") };
}

export default function EmailSettingsPage() {
  return <EmailSettingsForm />;
}
