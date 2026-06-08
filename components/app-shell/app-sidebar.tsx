"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GaugeIcon,
  HelpCircleIcon,
  SearchIcon,
  ShieldIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Can } from "@/components/can";
import { HouseholdNav } from "@/components/app-shell/household-nav";
import { ProfileMenu } from "@/components/app-shell/profile-menu";
import { HouseholdSwitcher } from "@/components/households/household-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { adminRoutes } from "@/lib/admin-routes";

const ADMIN_PERMISSIONS = adminRoutes.map((route) => route.permission);

/**
 * Sidebar shape:
 *   Header — brand + Dashboard + Picker
 *   Content — active-household contextual nav (rendered by <HouseholdNav/>)
 *   Footer — Search, Administration, Help, ProfileMenu
 *
 * The cross-household/personal/active-household split corresponds to the three
 * scope categories the app exposes (see lib/active-household-context.ts).
 */
export function AppSidebar({ onSearchOpen }: { onSearchOpen: () => void }) {
  const t = useTranslations("app.shell");
  const pathname = usePathname();

  const isActive = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            M
          </div>
          <div className="grid text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-medium">{t("brand")}</span>
            <span className="text-xs text-muted-foreground">
              {t("workspaceLabel")}
            </span>
          </div>
        </div>

        <SidebarGroup className="p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isActive("/app", true)}
                tooltip={t("dashboard")}
                render={<Link href="/app" />}
              >
                <GaugeIcon />
                <span>{t("dashboard")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <div className="group-data-[collapsible=icon]:hidden">
          <HouseholdSwitcher />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <HouseholdNav />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={`${t("search")} (⌘K)`}
              onClick={onSearchOpen}
            >
              <SearchIcon />
              <span>{t("search")}</span>
              <span className="ml-auto text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                ⌘K
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <Can anyOf={ADMIN_PERMISSIONS}>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isActive("/app/admin")}
                tooltip={t("administration")}
                render={<Link href="/app/admin" />}
              >
                <ShieldIcon />
                <span>{t("administration")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </Can>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              disabled
              aria-disabled
              tooltip={t("help")}
            >
              <HelpCircleIcon />
              <span>{t("help")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ProfileMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
