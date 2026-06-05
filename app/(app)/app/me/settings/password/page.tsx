import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PasswordSettingsForm } from "@/components/settings/password-settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.settings");
  return { title: t("password") };
}

export default function PasswordSettingsPage() {
  return <PasswordSettingsForm />;
}
