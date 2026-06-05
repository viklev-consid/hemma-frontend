"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getOrganizationOptions,
  listMyOrganizationsOptions,
  listMyOrganizationsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type {
  GetOrganizationResponse,
  ListMyOrganizationsResponse,
} from "@/api/generated";
import { problemHasErrorCode, type ProblemDetails } from "@/api/problems";
import { AccessModeBadge } from "@/components/organizations/access-mode-badge";
import { OrgRoleBadge } from "@/components/organizations/org-role-badge";
import { Spinner } from "@/components/ui/spinner";
import { OrgContext, type OrgContextValue } from "@/lib/org-context";
import { isPlatformOverride } from "@/lib/org-access-mode";
import { ORG_PERMISSION } from "@/lib/org-permission-strings";

type OrgShellProps = {
  slug: string;
  children: React.ReactNode;
};

/**
 * Active-organization shell.
 *
 * Resolution order:
 * 1. Look up the slug in the cached `/my` response. Members hit this path.
 * 2. Fall back to `getOrganization(slug)` for platform admins acting under
 *    `PlatformOverride` (they aren't in `/my`).
 * 3. Treat a 404 as "soft-deleted or you were removed": drop the stale
 *    `/my` entry, toast, and bounce to `/app/organizations`.
 *
 * The resolved organization seeds `OrgContext` for descendants. The shell
 * also renders the header (name, role badge, access-mode badge, nav tabs).
 */
export function OrgShell({ slug, children }: OrgShellProps) {
  const t = useTranslations("organizations.shell");
  const pathname = usePathname();
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  // Always issue the GET, regardless of `/my` cache state, because the
  // response carries `accessMode` (which `/my` does not). Cheap with the
  // QueryClient's 30s staleTime.
  const orgQuery = useQuery({
    ...getOrganizationOptions({ path: { organizationRef: slug } }),
    retry: (attemptIndex, error) => {
      // 404 is terminal — no point retrying.
      const status = (error as unknown as ProblemDetails)?.status;
      return ![401, 403, 404].includes(status) && attemptIndex < 2;
    },
  });

  // Pull the membership record for role + scoped-permission context.
  // Subscribed (not cache-peek) so the badge / role rerender once /my
  // resolves on first paint. Absent for platform-override admins who
  // aren't actually members of this org.
  const myOrgsQuery = useQuery(listMyOrganizationsOptions());
  const myOrgs = myOrgsQuery.data;
  const membership = myOrgs?.organizations.find((org) => org.slug === slug);

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
        "Organizations.NotFound",
      );
    if (!isGone) return;

    if (myOrgs) {
      queryClient.setQueryData<ListMyOrganizationsResponse>(
        listMyOrganizationsQueryKey(),
        {
          organizations: myOrgs.organizations.filter((o) => o.slug !== slug),
        },
      );
    }
    toast.error(t("removed.title"), { description: t("removed.description") });
    replace("/app");
  }, [orgQuery.error, myOrgs, queryClient, replace, slug, t]);

  const contextValue = useMemo<OrgContextValue | null>(() => {
    const org = orgQuery.data as GetOrganizationResponse | undefined;
    if (!org) return null;
    return {
      organizationId: org.organizationId,
      slug: org.slug,
      name: org.name,
      role: membership?.role,
      accessMode: org.accessMode,
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
  // scoped permission via <Can inOrg=... /> — disabled tabs would just lead
  // to empty/forbidden states.
  //
  // Audit is the exception: it's a narrowly-scoped capability and the page
  // surface itself is dense + slow to load, so we hide the tab when the
  // caller lacks `organizations.audit.read` to avoid teasing UI they can't
  // use. Sourced from the already-subscribed `/my` listing so this stays
  // reactive when permissions refresh.
  const canReadAudit =
    isPlatformOverride(orgQuery.data?.accessMode) ||
    (membership?.permissions.includes(ORG_PERMISSION.AuditRead) ?? false);

  const tabs = [
    { href: `/app/o/${slug}`, key: "overview", exact: true },
    {
      href: `/app/o/${slug}/members`,
      key: "members",
      exact: false,
    },
    {
      href: `/app/o/${slug}/invitations`,
      key: "invitations",
      exact: false,
    },
    ...(canReadAudit
      ? [
          {
            href: `/app/o/${slug}/audit`,
            key: "audit" as const,
            exact: false,
          },
        ]
      : []),
    {
      href: `/app/o/${slug}/settings`,
      key: "settings",
      exact: false,
    },
  ] as const;

  const isActive = (href: string, exact: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <OrgContext.Provider value={contextValue}>
      <section className="grid gap-4">
        <header className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{contextValue.name}</h1>
            {contextValue.role ? (
              <OrgRoleBadge role={contextValue.role} />
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
    </OrgContext.Provider>
  );
}
