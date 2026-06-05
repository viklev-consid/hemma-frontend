"use client";

import { createContext, use } from "react";

import type { MyOrganizationItem } from "@/api/generated/types.gen";

/**
 * Cross-app active-org context.
 *
 * Provided by `<ActiveOrgProvider>` near the top of the `(app)` tree.
 * Resolves the user's "currently selected org" from URL + OrgContext +
 * localStorage + `/v1/organizations/my`, with explicit precedence (see
 * the provider).
 *
 * Contract:
 * - `activeOrg` is **null** when the user has no membership and no
 *   in-URL org (e.g. on `/app` or `/app/me/*` with zero orgs in `/my`).
 *   Sidebar middle section renders accordingly.
 * - `pin(slug)` writes the storage hint; `unpin()` clears it. The picker
 *   calls these. URL-driven entries pin automatically as a side effect
 *   inside the provider.
 * - `source` is a debug-friendly tag indicating which step of the
 *   resolution chain produced the value. Consumers should not branch on
 *   it; it exists for tooling and dev assertions.
 *
 * For permission checks and data fetching, prefer the strict `useOrg()`
 * from `lib/org-context.ts` inside the org shell. This hook is for the
 * global sidebar and other cross-app surfaces that need to know "which
 * org are we conceptually in right now."
 */
export type ActiveOrgValue = {
  activeOrg: MyOrganizationItem | null;
  pin: (slug: string) => void;
  unpin: () => void;
  source: "context" | "url" | "pinned" | "auto" | "none";
};

const noop = () => {
  /* no-op */
};

const DEFAULT_VALUE: ActiveOrgValue = {
  activeOrg: null,
  pin: noop,
  unpin: noop,
  source: "none",
};

export const ActiveOrgContext = createContext<ActiveOrgValue>(DEFAULT_VALUE);

export function useActiveOrg(): ActiveOrgValue {
  return use(ActiveOrgContext);
}
