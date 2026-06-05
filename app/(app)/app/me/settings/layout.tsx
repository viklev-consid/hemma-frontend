import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SettingsTabs } from "@/components/app-shell/settings-tabs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.settings");
  return { title: t("shell") };
}

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("settings.shell");

  return (
    <>
      <header className="grid gap-1">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>
      <SettingsTabs />
      <section className="min-w-0">{children}</section>
    </>
  );
}
