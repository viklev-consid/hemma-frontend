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
import { useActiveOrg } from "@/lib/active-org-context";

/**
 * Middle sidebar section — the active organization's contextual nav.
 *
 * Today this renders just the org overview link. The intent is that
 * future per-org feature scopes (projects, etc.) drop in here without
 * touching the sidebar's overall shape.
 *
 * Renders nothing when no org is active. The picker remains visible in
 * the header so the user can switch / create — they just don't see a
 * contextual nav until they pick or arrive inside an org.
 */
export function OrgNav() {
  const t = useTranslations("app.shell");
  const { activeOrg } = useActiveOrg();
  const pathname = usePathname();

  if (!activeOrg) return null;

  const overviewHref = `/app/o/${activeOrg.slug}`;

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
