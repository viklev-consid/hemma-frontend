"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  HouseIcon,
  LayoutDashboardIcon,
  WalletIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useActiveHousehold } from "@/lib/active-household-context";
import { useCanInActiveHousehold } from "@/lib/active-household-permissions";
import { PROPERTY_PERMISSION } from "@/lib/household-permission-strings";

const ECONOMY_NAV_ITEMS = [
  { key: "transactions", path: "transactions" },
  { key: "transfers", path: "transfers" },
  { key: "budget", path: "budget" },
  { key: "recurring", path: "recurring" },
  { key: "subscriptions", path: "subscriptions" },
  { key: "analytics", path: "analytics" },
  { key: "accounts", path: "accounts" },
  { key: "categories", path: "categories" },
  { key: "rules", path: "rules" },
  { key: "import", path: "import" },
  { key: "privacy", path: "privacy" },
] as const;

const PROPERTY_NAV_ITEMS = [
  { key: "projects", path: "projects" },
  { key: "maintenance", path: "maintenance" },
  { key: "logbook", path: "logbook" },
] as const;

/**
 * Middle sidebar section — the active household's contextual nav.
 *
 * Renders nothing when no household is active. The picker remains visible in
 * the header so the user can switch / create — they just don't see a
 * contextual nav until they pick or arrive inside a household.
 */
export function HouseholdNav() {
  const t = useTranslations("app.shell");
  const te = useTranslations("economy.shell.nav");
  const tp = useTranslations("property.shell.nav");
  const { activeHousehold } = useActiveHousehold();
  const pathname = usePathname();
  const [economyOpen, setEconomyOpen] = useState(true);
  const [propertyOpen, setPropertyOpen] = useState(false);
  // Override-aware read gate: a PlatformOverride admin isn't in `/my`, so a raw
  // permission lookup would hide the group from them — `useCanInActiveHousehold`
  // grants them through (see lib/active-household-permissions.ts).
  const canReadProperty = useCanInActiveHousehold(PROPERTY_PERMISSION.Read);

  const overviewHref = activeHousehold ? `/app/h/${activeHousehold.slug}` : "";
  const economyHref = `${overviewHref}/economy`;
  const isEconomyRoute =
    pathname === economyHref || pathname.startsWith(`${economyHref}/`);
  const propertyHref = `${overviewHref}/property`;
  const isPropertyRoute =
    pathname === propertyHref || pathname.startsWith(`${propertyHref}/`);

  if (!activeHousehold) return null;

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
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            isActive={isEconomyRoute}
            tooltip={t("orgEconomy")}
            aria-expanded={economyOpen}
            onClick={() => setEconomyOpen((open) => !open)}
          >
            <WalletIcon />
            <span>{t("orgEconomy")}</span>
            {economyOpen ? (
              <ChevronDownIcon className="ml-auto" />
            ) : (
              <ChevronRightIcon className="ml-auto" />
            )}
          </SidebarMenuButton>
          {economyOpen ? (
            <SidebarMenuSub>
              {ECONOMY_NAV_ITEMS.map((item) => {
                const href = `${economyHref}/${item.path}`;
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <SidebarMenuSubItem key={item.key}>
                    <SidebarMenuSubButton
                      isActive={active}
                      render={<Link href={href} />}
                    >
                      <span>{te(item.key)}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          ) : null}
        </SidebarMenuItem>
        {canReadProperty ? (
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              isActive={isPropertyRoute}
              tooltip={t("orgProperty")}
              aria-expanded={propertyOpen}
              onClick={() => setPropertyOpen((open) => !open)}
            >
              <HouseIcon />
              <span>{t("orgProperty")}</span>
              {propertyOpen ? (
                <ChevronDownIcon className="ml-auto" />
              ) : (
                <ChevronRightIcon className="ml-auto" />
              )}
            </SidebarMenuButton>
            {propertyOpen ? (
              <SidebarMenuSub>
                {PROPERTY_NAV_ITEMS.map((item) => {
                  const href = `${propertyHref}/${item.path}`;
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <SidebarMenuSubItem key={item.key}>
                      <SidebarMenuSubButton
                        isActive={active}
                        render={<Link href={href} />}
                      >
                        <span>{tp(item.key)}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            ) : null}
          </SidebarMenuItem>
        ) : null}
      </SidebarMenu>
    </SidebarGroup>
  );
}
