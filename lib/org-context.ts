"use client";

import { createContext, use } from "react";

import type { AccessMode } from "@/lib/org-access-mode";

/**
 * Active-organization context.
 *
 * Set by `app/(app)/app/o/[slug]/layout.tsx` after resolving
 * the slug to an organization GUID. Components beneath the org shell read
 * `organizationId` here rather than re-resolving the slug themselves.
 *
 * `role` and `accessMode` come from different sources:
 * - `role` is the caller's role on this org, sourced from the `/my` cache.
 *   Undefined when the caller is a platform admin acting under override —
 *   they're not a member of this org.
 * - `accessMode` is from `GET /v1/organizations/{ref}` and is always present
 *   for the active org.
 */
export type OrgContextValue = {
  organizationId: string;
  slug: string;
  name: string;
  role: string | undefined;
  accessMode: AccessMode | string;
};

export const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg(): OrgContextValue {
  const value = use(OrgContext);
  if (!value) {
    throw new Error(
      "useOrg must be used within an organization shell (o/[slug]/layout).",
    );
  }
  return value;
}

export function useOrgOptional(): OrgContextValue | null {
  return use(OrgContext);
}
