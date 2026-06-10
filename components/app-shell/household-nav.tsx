"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
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
  const { activeHousehold } = useActiveHousehold();
  const pathname = usePathname();
  const [economyOpen, setEconomyOpen] = useState(true);

  const overviewHref = activeHousehold ? `/app/h/${activeHousehold.slug}` : "";
  const economyHref = `${overviewHref}/economy`;
  const isEconomyRoute =
    pathname === economyHref || pathname.startsWith(`${economyHref}/`);

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
      </SidebarMenu>
    </SidebarGroup>
  );
}
