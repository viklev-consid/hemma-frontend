"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { listMyOrganizationsOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { MyOrganizationItem } from "@/api/generated/types.gen";
import { useAuth } from "@/components/auth-provider";
import {
  ActiveOrgContext,
  type ActiveOrgValue,
} from "@/lib/active-org-context";
import {
  clearActiveOrgSlug,
  readActiveOrgSlug,
  writeActiveOrgSlug,
} from "@/lib/active-org-storage";
import { useOrgOptional } from "@/lib/org-context";

/**
 * Module-level emitter so `useSyncExternalStore` consumers re-read
 * localStorage when *we* mutate it. localStorage doesn't fire `storage`
 * events for same-tab writes, so we publish manually after every write
 * / clear. Cross-tab sync would also use the `storage` event — captured
 * as a follow-up, not wired here.
 */
const storageListeners = new Set<() => void>();
function notifyStorageChange() {
  storageListeners.forEach((fn) => fn());
}
function subscribeStorage(fn: () => void) {
  storageListeners.add(fn);
  return () => {
    storageListeners.delete(fn);
  };
}

/**
 * Read the pinned slug for the given user as an external store.
 * Returning the value through `useSyncExternalStore` lets writers
 * (`pin` / `unpin`) trigger consumer re-renders without setState-in-effect.
 */
function usePinnedSlug(userId: string | null): string | null {
  const getSnapshot = useCallback(() => readActiveOrgSlug(userId), [userId]);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribeStorage, getSnapshot, getServerSnapshot);
}

/**
 * Extract the active slug from the URL. Matches `/app/o/:slug` and any
 * sub-route. Returns null when the user is not under the org tree.
 */
function activeSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/app\/o\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Resolution order:
 *   1. `OrgContext` — when we're already inside the org-shell layout, it
 *      has the authoritative answer (and works for PlatformOverride
 *      admins whose org isn't in `/my`).
 *   2. URL slug, reconciled against `/my`. Catches the moment between
 *      `<Link>` navigation and the org-shell layout mounting.
 *   3. Pinned slug from localStorage, reconciled against `/my`. Pure
 *      sidebar UX state for cross-org / personal pages.
 *   4. Auto-pin if `/my` has exactly one org (derived only — NOT written
 *      to storage, so the auto-pin gracefully gives way when the user
 *      joins a second org).
 *   5. null.
 *
 * Side effects (all idempotent, no setState):
 *   - When the URL produces a slug that resolves in `/my`, write the
 *     storage pin so leaving to `/app` / `/app/me/*` preserves context.
 *   - When the pinned slug is stale (not in `/my`), clear it.
 */
export function ActiveOrgProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const userId = currentUser?.userId ?? null;
  const pathname = usePathname();
  const orgContext = useOrgOptional();
  const { data } = useQuery({
    ...listMyOrganizationsOptions(),
    enabled: Boolean(userId),
  });

  const organizations = useMemo(
    () => data?.organizations ?? [],
    [data?.organizations],
  );

  const pinnedSlug = usePinnedSlug(userId);
  const urlSlug = activeSlugFromPath(pathname);

  const resolved = useMemo<{
    activeOrg: MyOrganizationItem | null;
    source: ActiveOrgValue["source"];
  }>(() => {
    // 1. OrgContext (set by org-shell layout) — authoritative when present.
    if (orgContext) {
      const fromMy = organizations.find(
        (o) => o.organizationId === orgContext.organizationId,
      );
      if (fromMy) {
        return { activeOrg: fromMy, source: "context" };
      }
      // PlatformOverride: not a member, so not in `/my`. Synthesize a
      // minimal `MyOrganizationItem` so sidebar nav still renders.
      // `permissions` is deliberately empty — the user has none on a
      // per-org basis, they're acting via platform override.
      //
      // Permission-gated sidebar items must therefore use
      // `useCanInActiveOrg(perm)` from `lib/active-org-permissions.ts`,
      // not a bare `<Can inOrg=...>`. The helper consults
      // `OrgContext.accessMode` and grants override admins through;
      // raw `<Can>` would silently hide affordances they can use.
      return {
        activeOrg: {
          organizationId: orgContext.organizationId,
          slug: orgContext.slug,
          name: orgContext.name,
          role: orgContext.role ?? "",
          permissions: [],
          permissionsVersion: "",
        },
        source: "context",
      };
    }

    // 2. URL slug.
    if (urlSlug) {
      const fromMy = organizations.find((o) => o.slug === urlSlug);
      if (fromMy) {
        return { activeOrg: fromMy, source: "url" };
      }
    }

    // 3. Pinned slug.
    if (pinnedSlug) {
      const fromMy = organizations.find((o) => o.slug === pinnedSlug);
      if (fromMy) {
        return { activeOrg: fromMy, source: "pinned" };
      }
    }

    // 4. Single-org auto-pin.
    if (organizations.length === 1) {
      return { activeOrg: organizations[0], source: "auto" };
    }

    return { activeOrg: null, source: "none" };
  }, [orgContext, urlSlug, pinnedSlug, organizations]);

  // URL → pin sync. Persist the in-URL slug so leaving the org tree
  // preserves the sidebar context. No setState — the storage write
  // notifies subscribers via `notifyStorageChange`.
  useEffect(() => {
    if (!userId) return;
    if (!urlSlug) return;
    const exists = organizations.some((o) => o.slug === urlSlug);
    if (!exists) return;
    if (urlSlug === pinnedSlug) return;
    writeActiveOrgSlug(userId, urlSlug);
    notifyStorageChange();
  }, [userId, urlSlug, organizations, pinnedSlug]);

  // Reconciliation: drop a pinned slug that's no longer in `/my` (org
  // deleted or membership removed). Gated on `data` being loaded so we
  // don't clear during the pre-fetch window.
  useEffect(() => {
    if (!userId) return;
    if (!data) return;
    if (!pinnedSlug) return;
    const exists = organizations.some((o) => o.slug === pinnedSlug);
    if (!exists) {
      clearActiveOrgSlug(userId);
      notifyStorageChange();
    }
  }, [userId, data, pinnedSlug, organizations]);

  const pin = useCallback(
    (slug: string) => {
      if (!userId) return;
      writeActiveOrgSlug(userId, slug);
      notifyStorageChange();
    },
    [userId],
  );

  const unpin = useCallback(() => {
    if (!userId) return;
    clearActiveOrgSlug(userId);
    notifyStorageChange();
  }, [userId]);

  const value = useMemo<ActiveOrgValue>(
    () => ({
      activeOrg: resolved.activeOrg,
      pin,
      unpin,
      source: resolved.source,
    }),
    [resolved.activeOrg, resolved.source, pin, unpin],
  );

  return (
    <ActiveOrgContext.Provider value={value}>
      {children}
    </ActiveOrgContext.Provider>
  );
}
