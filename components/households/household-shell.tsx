"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getHouseholdOptions,
  listMyHouseholdsOptions,
  listMyHouseholdsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type {
  GetHouseholdResponse,
  ListMyHouseholdsResponse,
} from "@/api/generated";
import { problemHasErrorCode, type ProblemDetails } from "@/api/problems";
import { AccessModeBadge } from "@/components/households/access-mode-badge";
import { HouseholdRoleBadge } from "@/components/households/household-role-badge";
import { Spinner } from "@/components/ui/spinner";
import {
  HouseholdContext,
  type HouseholdContextValue,
} from "@/lib/household-context";
import { isPlatformOverride } from "@/lib/household-access-mode";
import { HOUSEHOLD_PERMISSION } from "@/lib/household-permission-strings";

type HouseholdShellProps = {
  slug: string;
  children: React.ReactNode;
};

/**
 * Active-household shell.
 *
 * Resolution order:
 * 1. Look up the slug in the cached `/my` response. Members hit this path.
 * 2. Fall back to `getHousehold(slug)` for platform admins acting under
 *    `PlatformOverride` (they aren't in `/my`).
 * 3. Treat a 404 as "soft-deleted or you were removed": drop the stale
 *    `/my` entry, toast, and bounce to `/app/households`.
 *
 * The resolved household seeds `HouseholdContext` for descendants. The shell
 * also renders the header (name, role badge, access-mode badge, nav tabs).
 */
export function HouseholdShell({ slug, children }: HouseholdShellProps) {
  const t = useTranslations("households.shell");
  const pathname = usePathname();
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  // Always issue the GET, regardless of `/my` cache state, because the
  // response carries `accessMode` (which `/my` does not). Cheap with the
  // QueryClient's 30s staleTime.
  const orgQuery = useQuery({
    ...getHouseholdOptions({ path: { householdRef: slug } }),
    retry: (attemptIndex, error) => {
      // 404 is terminal — no point retrying.
      const status = (error as unknown as ProblemDetails)?.status;
      return ![401, 403, 404].includes(status) && attemptIndex < 2;
    },
  });

  // Pull the membership record for role + scoped-permission context.
  // Subscribed (not cache-peek) so the badge / role rerender once /my
  // resolves on first paint. Absent for platform-override admins who
  // aren't actually members of this household.
  const myHouseholdsQuery = useQuery(listMyHouseholdsOptions());
  const myHouseholds = myHouseholdsQuery.data;
  const membership = myHouseholds?.households.find(
    (household) => household.slug === slug,
  );

  // Handle 404 as "no longer accessible": evict the stale /my entry (if any)
  // and bounce out. Effect rather than render-time redirect so it runs once
  // and the toast can fire.
  useEffect(() => {
    if (orgQuery.error == null) return;
    const status = (orgQuery.error as unknown as ProblemDetails).status;
    const isGone =
      status === 404 ||
      problemHasErrorCode(
        orgQuery.error as unknown as ProblemDetails,
        "Households.NotFound",
      );
    if (!isGone) return;

    if (myHouseholds) {
      queryClient.setQueryData<ListMyHouseholdsResponse>(
        listMyHouseholdsQueryKey(),
        {
          households: myHouseholds.households.filter((o) => o.slug !== slug),
        },
      );
    }
    toast.error(t("removed.title"), { description: t("removed.description") });
    replace("/app");
  }, [orgQuery.error, myHouseholds, queryClient, replace, slug, t]);

  const contextValue = useMemo<HouseholdContextValue | null>(() => {
    const household = orgQuery.data as GetHouseholdResponse | undefined;
    if (!household) return null;
    return {
      householdId: household.householdId,
      slug: household.slug,
      name: household.name,
      role: membership?.role,
      accessMode: household.accessMode,
    };
  }, [orgQuery.data, membership?.role]);

  if (orgQuery.isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  if (
    orgQuery.isError &&
    (orgQuery.error as unknown as ProblemDetails)?.status === 404
  ) {
    // The effect above will route away; in the meantime, render nothing.
    return null;
  }

  if (orgQuery.isError) {
    // Non-404 error (network, 5xx, etc.) — show a transient error card.
    // We deliberately don't `notFound()` here: that would steer users to
    // the route-level not-found UI for what's almost certainly a recoverable
    // failure.
    return (
      <div className="grid min-h-[40vh] place-items-center text-center">
        <div className="grid gap-1">
          <p className="text-sm font-medium">{t("error.title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("error.description")}
          </p>
        </div>
      </div>
    );
  }

  if (!contextValue) {
    // No data and no error — render nothing while React Query settles.
    return null;
  }

  // Tabs that always render. Each underlying page additionally guards by
  // scoped permission via <Can inHousehold=... /> — disabled tabs would just lead
  // to empty/forbidden states.
  //
  // Audit is the exception: it's a narrowly-scoped capability and the page
  // surface itself is dense + slow to load, so we hide the tab when the
  // caller lacks `households.audit.read` to avoid teasing UI they can't
  // use. Sourced from the already-subscribed `/my` listing so this stays
  // reactive when permissions refresh.
  const canReadAudit =
    isPlatformOverride(orgQuery.data?.accessMode) ||
    (membership?.permissions.includes(HOUSEHOLD_PERMISSION.AuditRead) ?? false);

  const tabs = [
    { href: `/app/h/${slug}`, key: "overview", exact: true },
    {
      href: `/app/h/${slug}/economy`,
      key: "economy",
      exact: false,
    },
    {
      href: `/app/h/${slug}/members`,
      key: "members",
      exact: false,
    },
    {
      href: `/app/h/${slug}/invitations`,
      key: "invitations",
      exact: false,
    },
    ...(canReadAudit
      ? [
          {
            href: `/app/h/${slug}/audit`,
            key: "audit" as const,
            exact: false,
          },
        ]
      : []),
    {
      href: `/app/h/${slug}/settings`,
      key: "settings",
      exact: false,
    },
  ] as const;

  const isActive = (href: string, exact: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <HouseholdContext.Provider value={contextValue}>
      <section className="grid gap-4">
        <header className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{contextValue.name}</h1>
            {contextValue.role ? (
              <HouseholdRoleBadge role={contextValue.role} />
            ) : null}
            <AccessModeBadge
              accessMode={contextValue.accessMode}
              isMember={Boolean(membership)}
            />
          </div>
          <p className="text-xs text-muted-foreground">/{contextValue.slug}</p>
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
    </HouseholdContext.Provider>
  );
}
