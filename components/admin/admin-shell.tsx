"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { SectionTabs } from "@/components/app-shell/section-tabs";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { adminRoutes } from "@/lib/admin-routes";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.shell");
  const tNav = useTranslations("admin.nav");
  const { isLoading, currentUser, permissions } = useAuth();

  if (isLoading || !currentUser) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  const visibleLinks = adminRoutes.filter((link) =>
    permissions.includes(link.permission),
  );

  if (visibleLinks.length === 0) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Card className="max-w-md">
          <CardContent className="grid gap-2 py-6">
            <h1 className="text-base font-medium">{t("accessDenied.title")}</h1>
            <p className="text-muted-foreground">
              {t("accessDenied.description")}
            </p>
            <Link
              href="/app"
              className="text-sm font-medium underline underline-offset-4"
            >
              {t("accessDenied.back")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = visibleLinks.map((route) => ({
    href: route.href,
    label: tNav(route.labelKey),
    icon: route.icon,
  }));

  return (
    <>
      <header className="grid gap-1">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>
      <SectionTabs tabs={tabs} />
      <section className="min-w-0">{children}</section>
    </>
  );
}
