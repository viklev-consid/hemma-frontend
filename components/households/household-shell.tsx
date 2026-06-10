"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { listMyHouseholdsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { AccessModeBadge } from "@/components/households/access-mode-badge";
import { HouseholdRoleBadge } from "@/components/households/household-role-badge";
import { isPlatformOverride } from "@/lib/household-access-mode";
import { useHousehold } from "@/lib/household-context";
import { HOUSEHOLD_PERMISSION } from "@/lib/household-permission-strings";

type HouseholdShellProps = {
  children: React.ReactNode;
};

/**
 * Visual shell for household overview/admin pages only.
 *
 * Economy routes share the active household provider but live outside this
 * route group so they do not inherit the overview/members/invitations tabs.
 */
export function HouseholdShell({ children }: HouseholdShellProps) {
  const t = useTranslations("households.shell");
  const pathname = usePathname();
  const household = useHousehold();

  const myHouseholdsQuery = useQuery(listMyHouseholdsOptions());
  const membership = myHouseholdsQuery.data?.households.find(
    (item) => item.slug === household.slug,
  );

  const canReadAudit =
    isPlatformOverride(household.accessMode) ||
    (membership?.permissions.includes(HOUSEHOLD_PERMISSION.AuditRead) ?? false);

  const tabs = [
    { href: `/app/h/${household.slug}`, key: "overview", exact: true },
    {
      href: `/app/h/${household.slug}/members`,
      key: "members",
      exact: false,
    },
    {
      href: `/app/h/${household.slug}/invitations`,
      key: "invitations",
      exact: false,
    },
    ...(canReadAudit
      ? [
          {
            href: `/app/h/${household.slug}/audit`,
            key: "audit" as const,
            exact: false,
          },
        ]
      : []),
    {
      href: `/app/h/${household.slug}/settings`,
      key: "settings",
      exact: false,
    },
  ] as const;

  const isActive = (href: string, exact: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <section className="grid gap-4">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{household.name}</h1>
          {household.role ? <HouseholdRoleBadge role={household.role} /> : null}
          <AccessModeBadge
            accessMode={household.accessMode}
            isMember={Boolean(membership)}
          />
        </div>
        <p className="text-xs text-muted-foreground">/{household.slug}</p>
      </header>
      <nav
        aria-label={t("nav.label")}
        className="flex flex-wrap gap-1 border-b text-sm"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href, tab.exact);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                "border-b-2 px-3 py-2 -mb-px transition-colors " +
                (active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {t(`nav.${tab.key}`)}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </section>
  );
}
