"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { getEconomySettingsOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { ProblemDetails } from "@/api/problems";
import { Spinner } from "@/components/ui/spinner";
import { useHousehold } from "@/lib/household-context";

type EconomyShellProps = {
  slug: string;
  children: React.ReactNode;
};

/**
 * Economy sub-shell: the first-run gate plus the economy sub-nav.
 *
 * First-run gate — `GET /v1/economy/settings` is the discriminator (NOT
 * `/accounts`, which is empty independently of setup state):
 * - `404` → economy is uninitialized. Redirect to the setup wizard. The wizard
 *   route itself renders bare (no sub-nav) so the user can complete setup.
 * - `200` → initialized. Render the sub-nav + page. If the user is sitting on
 *   the setup route, bounce them to the budget (setup is already done).
 *
 * The 404 is a valid "uninitialized" state, not an error — we never toast it.
 * `householdId` comes from the household shell context (members and owners both
 * get here; economy is membership-gated, not permission-string-gated).
 */
export function EconomyShell({ slug, children }: EconomyShellProps) {
  const t = useTranslations("economy.shell");
  const pathname = usePathname();
  const { replace } = useRouter();
  const { householdId } = useHousehold();

  const settingsQuery = useQuery({
    ...getEconomySettingsOptions({ query: { householdId } }),
    retry: (attemptIndex, error) => {
      // 404 (uninitialized) and auth failures are terminal — don't retry.
      const status = (error as unknown as ProblemDetails)?.status;
      return ![401, 403, 404].includes(status) && attemptIndex < 2;
    },
  });

  const setupHref = `/app/h/${slug}/economy/setup`;
  const budgetHref = `/app/h/${slug}/economy/budget`;
  // The daily-driver landing: where initialized users go after setup.
  const homeHref = `/app/h/${slug}/economy/transactions`;
  const isSetupRoute = pathname === setupHref;

  const errorStatus = (settingsQuery.error as unknown as ProblemDetails | null)
    ?.status;
  const isUninitialized = settingsQuery.isError && errorStatus === 404;
  const isInitialized = settingsQuery.isSuccess;

  // Redirect in an effect (not during render) so it runs once and doesn't
  // fight React's render pass. Both directions are guarded by the route.
  useEffect(() => {
    if (isUninitialized && !isSetupRoute) {
      replace(setupHref);
    } else if (isInitialized && isSetupRoute) {
      replace(homeHref);
    }
  }, [
    isUninitialized,
    isInitialized,
    isSetupRoute,
    replace,
    setupHref,
    homeHref,
  ]);

  if (settingsQuery.isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  // Non-404 failure (network / 5xx) — transient error card, same shape as the
  // household shell. A 404 is handled below as the uninitialized state.
  if (settingsQuery.isError && errorStatus !== 404) {
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

  // Setup route renders the wizard bare while uninitialized; once initialized
  // the effect above redirects to the budget, so render nothing meanwhile.
  if (isSetupRoute) {
    return isUninitialized ? <>{children}</> : null;
  }

  // Non-setup routes require initialized settings; otherwise we're redirecting
  // to setup, so render nothing in the interim.
  if (!isInitialized) {
    return null;
  }

  const tabs = [
    {
      href: `/app/h/${slug}/economy/transactions`,
      key: "transactions" as const,
    },
    { href: `/app/h/${slug}/economy/transfers`, key: "transfers" as const },
    { href: budgetHref, key: "budget" as const },
    { href: `/app/h/${slug}/economy/recurring`, key: "recurring" as const },
    { href: `/app/h/${slug}/economy/accounts`, key: "accounts" as const },
    { href: `/app/h/${slug}/economy/categories`, key: "categories" as const },
    { href: `/app/h/${slug}/economy/rules`, key: "rules" as const },
    { href: `/app/h/${slug}/economy/import`, key: "import" as const },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <section className="grid gap-4">
      <nav
        aria-label={t("nav.label")}
        className="flex flex-wrap gap-1 border-b text-sm"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
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
