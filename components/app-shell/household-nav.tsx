"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useActiveHousehold } from "@/lib/active-household-context";

/**
 * Middle sidebar section — the active household's contextual nav.
 *
 * Today this renders just the household overview link. The intent is that
 * future per-household feature scopes (projects, etc.) drop in here without
 * touching the sidebar's overall shape.
 *
 * Renders nothing when no household is active. The picker remains visible in
 * the header so the user can switch / create — they just don't see a
 * contextual nav until they pick or arrive inside a household.
 */
export function HouseholdNav() {
  const t = useTranslations("app.shell");
  const { activeHousehold } = useActiveHousehold();
  const pathname = usePathname();

  if (!activeHousehold) return null;

  const overviewHref = `/app/h/${activeHousehold.slug}`;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("orgNavLabel")}</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === overviewHref}
            tooltip={t("orgOverview")}
            render={<Link href={overviewHref} />}
          >
            <LayoutDashboardIcon />
            <span>{t("orgOverview")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
