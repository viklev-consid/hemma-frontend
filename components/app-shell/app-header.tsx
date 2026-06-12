"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { getPropertyProjectOptions } from "@/api/generated/@tanstack/react-query.gen";
import { BellDropdown } from "@/components/bell-dropdown";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  resolveBreadcrumb,
  type Crumb,
} from "@/components/app-shell/breadcrumb-config";
import { useActiveHousehold } from "@/lib/active-household-context";

export function AppHeader() {
  const pathname = usePathname();
  const crumbs = resolveBreadcrumb(pathname);
  const tShell = useTranslations("app.shell.breadcrumb");
  const tApp = useTranslations("app.shell");
  const tEconomyNav = useTranslations("economy.shell.nav");
  const tPropertyNav = useTranslations("property.shell.nav");
  const tSettings = useTranslations("settings.nav");
  const tAdmin = useTranslations("admin.nav");

  const { activeHousehold } = useActiveHousehold();
  const householdId = activeHousehold?.householdId ?? "";

  // The project-detail trail carries a dynamic `projectName` crumb. When it's
  // present, read the project's name from the React Query cache (warmed by the
  // detail page's prefetch — no extra request, no flash) keyed off the id in
  // the path. `enabled` keeps this inert on every other page.
  const needsProjectName = crumbs.some(
    (crumb) => crumb.ns === "dynamic" && crumb.key === "projectName",
  );
  const projectId = needsProjectName ? (pathname.split("/").pop() ?? "") : "";
  const { data: projectName } = useQuery({
    ...getPropertyProjectOptions({
      path: { projectId },
      query: { householdId },
    }),
    enabled: needsProjectName && projectId !== "" && householdId !== "",
    select: (project) => project.name,
  });

  function labelFor(crumb: Crumb): string {
    switch (crumb.ns) {
      case "settings.nav":
        return tSettings(crumb.key);
      case "admin.nav":
        return tAdmin(crumb.key);
      case "app.shell":
        return tApp(crumb.key);
      // Keys are URL segments validated against the section nav list in
      // breadcrumb-config, so the cast to next-intl's typed key is safe.
      case "economy.shell.nav":
        return tEconomyNav(crumb.key as Parameters<typeof tEconomyNav>[0]);
      case "property.shell.nav":
        return tPropertyNav(crumb.key as Parameters<typeof tPropertyNav>[0]);
      case "dynamic":
        return crumb.key === "householdName"
          ? (activeHousehold?.name ?? tShell("householdsActive"))
          : (projectName ?? tShell("propertyProjectDetail"));
      case "app.shell.breadcrumb":
        return tShell(crumb.key);
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-12 items-stretch border-b bg-background">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger />
      </div>
      <Separator orientation="vertical" className="!h-auto" />
      <nav
        aria-label="Breadcrumb"
        className="flex flex-1 items-center gap-1.5 px-4 text-xs text-muted-foreground"
      >
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          const label = labelFor(crumb);
          return (
            <span
              key={`${crumb.ns}.${crumb.key}`}
              className="flex items-center gap-1.5"
            >
              {i > 0 && <ChevronRightIcon className="size-3" />}
              {isLast || !crumb.href ? (
                <span className={isLast ? "text-foreground" : undefined}>
                  {label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground">
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      <div className="flex items-center px-4">
        <BellDropdown />
      </div>
    </header>
  );
}
