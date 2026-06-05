"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { listMyOrganizationsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { useAuth } from "@/components/auth-provider";

/**
 * Permission check.
 *
 * Without `orgId`, checks the global permissions array on `/v1/users/me`
 * (platform-level checks).
 *
 * With `orgId`, subscribes to `GET /v1/organizations/my` and checks the
 * per-org scoped permissions. Subscribing (rather than reading cache)
 * means components re-render when `/my` is refreshed after a role
 * change / accept-invite / leave. Returns `false` for orgs the caller
 * isn't a member of — including platform admins acting under
 * `PlatformOverride`, who pass these checks at the API level but won't
 * appear in `/my`. Pages rendering content for such admins should
 * additionally read `accessMode` from `OrgContext`.
 */
export function usePermission(permission: string, orgId?: string | null) {
  const { permissions } = useAuth();
  // Always subscribe so hook order stays stable across renders; `enabled`
  // makes the network call a no-op for global-only checks.
  const { data: orgPermissions } = useQuery({
    ...listMyOrganizationsOptions(),
    enabled: Boolean(orgId),
    select: (response) =>
      orgId
        ? (response.organizations.find((org) => org.organizationId === orgId)
            ?.permissions ?? [])
        : [],
  });

  if (orgId) {
    return (orgPermissions ?? []).includes(permission);
  }
  return permissions.includes(permission);
}

type CanProps = {
  permission?: string;
  anyOf?: readonly string[];
  /**
   * When set, all permission checks resolve against this organization's
   * scoped permissions instead of the global `/me` permissions.
   */
  inOrg?: string | null;
  children: ReactNode;
  fallback?: ReactNode;
};

export function Can({
  permission,
  anyOf,
  inOrg,
  children,
  fallback = null,
}: CanProps) {
  const { permissions: globalPermissions } = useAuth();
  const { data: orgPermissions } = useQuery({
    ...listMyOrganizationsOptions(),
    enabled: Boolean(inOrg),
    select: (response) =>
      inOrg
        ? (response.organizations.find((org) => org.organizationId === inOrg)
            ?.permissions ?? [])
        : [],
  });

  const check = (p: string) =>
    inOrg ? (orgPermissions ?? []).includes(p) : globalPermissions.includes(p);

  const isAllowed =
    (permission ? check(permission) : false) ||
    (anyOf ? anyOf.some(check) : false);

  return isAllowed ? children : fallback;
}
