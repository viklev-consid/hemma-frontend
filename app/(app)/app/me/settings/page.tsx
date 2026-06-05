import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LanguagePicker } from "@/components/language-picker";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.settings");
  return { title: t("profile") };
}

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <ProfileSettingsForm />
      <LanguagePicker />
    </div>
  );
}
