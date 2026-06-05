"use client";

import { useTranslations } from "next-intl";

import { SectionTabs } from "@/components/app-shell/section-tabs";
import { settingsRoutes } from "@/lib/settings-routes";

export function SettingsTabs() {
  const t = useTranslations("settings.nav");
  const tabs = settingsRoutes.map((route) => ({
    href: route.href,
    label: t(route.labelKey),
    icon: route.icon,
  }));
  return <SectionTabs tabs={tabs} />;
}
