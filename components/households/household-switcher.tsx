"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Building2Icon,
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
} from "lucide-react";

import { listMyHouseholdsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveHousehold } from "@/lib/active-household-context";
import { householdSwitchTarget } from "@/lib/household-switch-target";

/**
 * Household switcher.
 *
 * Reads `/v1/households/my` from the cache and the app-level active-household
 * context. Selecting a household pins it for cross-household / personal routes; when the
 * user is already in a household-scoped route, selection preserves the current
 * sub-page under the newly selected slug.
 *
 * When the user has no households, the trigger collapses to a
 * "Create household" CTA.
 */
export function HouseholdSwitcher() {
  const t = useTranslations("households.shell.switcher");
  const { data, isLoading } = useQuery(listMyHouseholdsOptions());
  const { push } = useRouter();
  const { activeHousehold, pin } = useActiveHousehold();

  const households = data?.households ?? [];

  if (!isLoading && households.length === 0) {
    // No memberships: surface the create affordance directly. The switcher
    // shouldn't pretend there are households to switch between.
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => push("/app/households/new")}
        aria-label={t("create")}
      >
        <PlusIcon className="size-4" />
        <span className="truncate group-data-[collapsible=icon]:hidden">
          {t("create")}
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-between gap-2"
            aria-label={t("label")}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Building2Icon className="size-4 shrink-0" />
              <span className="truncate group-data-[collapsible=icon]:hidden">
                {activeHousehold?.name ?? t("placeholder")}
              </span>
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        {/* Base UI requires GroupLabel to live inside a Group — wrap the
            membership list so the section heading attaches to a real group
            instead of crashing the menu. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
          {households.map((household) => {
            const isActive = household.householdId === activeHousehold?.householdId;
            // The row updates app-level selected household. If the current page is
            // household-scoped, it also preserves the current sub-page under the
            // newly selected slug.
            return (
              <DropdownMenuItem
                key={household.householdId}
                className="items-center justify-between gap-2"
                onClick={() => {
                  pin(household.slug);
                  const pathname = window.location.pathname;
                  const target = householdSwitchTarget(pathname, household.slug);
                  if (target && target !== pathname) {
                    push(target);
                  }
                }}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">{household.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    /{household.slug}
                  </span>
                </span>
                {isActive ? (
                  <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* No "View all" — the cross-household dashboard at /app surfaces the
            full list; duplicating it here just adds menu clutter. */}
        <DropdownMenuItem render={<Link href="/app/households/new" />}>
          <PlusIcon />
          <span>{t("create")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
