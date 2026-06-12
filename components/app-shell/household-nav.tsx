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
import {
  ECONOMY_NAV_ITEMS,
  PROPERTY_NAV_ITEMS,
} from "@/lib/household-sections";

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
  // Both groups start collapsed; `*Open` only tracks an explicit user toggle.
  // The section whose route is active is force-expanded below (derived), so
  // landing on or navigating to a sub-page always reveals that section's nav.
  const [economyOpen, setEconomyOpen] = useState(false);
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

  // Expanded when the user opened it OR its route is active. Derived (not an
  // effect) so it's hydration-safe and never flashes; the active section can't
  // be collapsed while you're in it, which is the intended behaviour.
  const economyExpanded = economyOpen || isEconomyRoute;
  const propertyExpanded = propertyOpen || isPropertyRoute;

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
            aria-expanded={economyExpanded}
            onClick={() => setEconomyOpen((open) => !open)}
          >
            <WalletIcon />
            <span>{t("orgEconomy")}</span>
            {economyExpanded ? (
              <ChevronDownIcon className="ml-auto" />
            ) : (
              <ChevronRightIcon className="ml-auto" />
            )}
          </SidebarMenuButton>
          {economyExpanded ? (
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
              aria-expanded={propertyExpanded}
              onClick={() => setPropertyOpen((open) => !open)}
            >
              <HouseIcon />
              <span>{t("orgProperty")}</span>
              {propertyExpanded ? (
                <ChevronDownIcon className="ml-auto" />
              ) : (
                <ChevronRightIcon className="ml-auto" />
              )}
            </SidebarMenuButton>
            {propertyExpanded ? (
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
