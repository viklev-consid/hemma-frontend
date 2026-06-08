"use client";

import { createContext, use } from "react";

import type { AccessMode } from "@/lib/household-access-mode";

/**
 * Active-household context.
 *
 * Set by `app/(app)/app/h/[slug]/layout.tsx` after resolving the slug to a
 * household GUID. Components beneath the household shell read `householdId`
 * here rather than re-resolving the slug themselves.
 *
 * `role` and `accessMode` come from different sources:
 * - `role` is the caller's role on this household, sourced from the `/my`
 *   cache. Undefined when the caller is a platform admin acting under
 *   override — they're not a member of this household.
 * - `accessMode` is from `GET /v1/households/{ref}` and is always present for
 *   the active household.
 */
export type HouseholdContextValue = {
  householdId: string;
  slug: string;
  name: string;
  role: string | undefined;
  accessMode: AccessMode | string;
};

export const HouseholdContext = createContext<HouseholdContextValue | null>(
  null,
);

export function useHousehold(): HouseholdContextValue {
  const value = use(HouseholdContext);
  if (!value) {
    throw new Error(
      "useHousehold must be used within a household shell (h/[slug]/layout).",
    );
  }
  return value;
}

export function useHouseholdOptional(): HouseholdContextValue | null {
  return use(HouseholdContext);
}
