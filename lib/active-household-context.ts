"use client";

import { createContext, use } from "react";

import type { MyHouseholdItem } from "@/api/generated/types.gen";

/**
 * Cross-app active-household context.
 *
 * Provided by `<ActiveHouseholdProvider>` near the top of the `(app)` tree.
 * Resolves the user's "currently selected household" from URL +
 * HouseholdContext + localStorage + `/v1/households/my`, with explicit
 * precedence (see the provider).
 *
 * Contract:
 * - `activeHousehold` is **null** when the user has no membership and no
 *   in-URL household (e.g. on `/app` or `/app/me/*` with zero households in
 *   `/my`). Sidebar middle section renders accordingly.
 * - `pin(slug)` writes the storage hint; `unpin()` clears it. The picker
 *   calls these. URL-driven entries pin automatically as a side effect inside
 *   the provider.
 * - `source` is a debug-friendly tag indicating which step of the resolution
 *   chain produced the value. Consumers should not branch on it; it exists for
 *   tooling and dev assertions.
 *
 * For permission checks and data fetching, prefer the strict `useHousehold()`
 * from `lib/household-context.ts` inside the household shell. This hook is for
 * the global sidebar and other cross-app surfaces that need to know "which
 * household are we conceptually in right now."
 */
export type ActiveHouseholdValue = {
  activeHousehold: MyHouseholdItem | null;
  pin: (slug: string) => void;
  unpin: () => void;
  source: "context" | "url" | "pinned" | "auto" | "none";
};

const noop = () => {
  /* no-op */
};

const DEFAULT_VALUE: ActiveHouseholdValue = {
  activeHousehold: null,
  pin: noop,
  unpin: noop,
  source: "none",
};

export const ActiveHouseholdContext =
  createContext<ActiveHouseholdValue>(DEFAULT_VALUE);

export function useActiveHousehold(): ActiveHouseholdValue {
  return use(ActiveHouseholdContext);
}
