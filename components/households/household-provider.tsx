"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Spinner } from "@/components/ui/spinner";
import {
  HouseholdContext,
  type HouseholdContextValue,
} from "@/lib/household-context";

type HouseholdProviderProps = {
  slug: string;
  children: React.ReactNode;
};

/**
 * Resolves the active household and provides context for all `/app/h/[slug]`
 * routes. Visual section chrome lives in route-specific shells.
 */
export function HouseholdProvider({ slug, children }: HouseholdProviderProps) {
  const t = useTranslations("households.shell");
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  const orgQuery = useQuery({
    ...getHouseholdOptions({ path: { householdRef: slug } }),
    retry: (attemptIndex, error) => {
      const status = (error as unknown as ProblemDetails)?.status;
      return ![401, 403, 404].includes(status) && attemptIndex < 2;
    },
  });

  const myHouseholdsQuery = useQuery(listMyHouseholdsOptions());
  const myHouseholds = myHouseholdsQuery.data;
  const membership = myHouseholds?.households.find(
    (household) => household.slug === slug,
  );

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
    return null;
  }

  if (orgQuery.isError) {
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
    return null;
  }

  return (
    <HouseholdContext.Provider value={contextValue}>
      {children}
    </HouseholdContext.Provider>
  );
}
