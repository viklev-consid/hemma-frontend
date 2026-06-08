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

import { listMyHouseholdsOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { HouseholdRole, MyHouseholdItem } from "@/api/generated/types.gen";
import { useAuth } from "@/components/auth-provider";
import {
  ActiveHouseholdContext,
  type ActiveHouseholdValue,
} from "@/lib/active-household-context";
import {
  clearActiveHouseholdSlug,
  readActiveHouseholdSlug,
  writeActiveHouseholdSlug,
} from "@/lib/active-household-storage";
import { useHouseholdOptional } from "@/lib/household-context";

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
  const getSnapshot = useCallback(() => readActiveHouseholdSlug(userId), [userId]);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribeStorage, getSnapshot, getServerSnapshot);
}

/**
 * Extract the active slug from the URL. Matches `/app/h/:slug` and any
 * sub-route. Returns null when the user is not under the household tree.
 */
function activeSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/app\/h\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Resolution order:
 *   1. `HouseholdContext` — when we're already inside the household-shell layout, it
 *      has the authoritative answer (and works for PlatformOverride
 *      admins whose household isn't in `/my`).
 *   2. URL slug, reconciled against `/my`. Catches the moment between
 *      `<Link>` navigation and the household-shell layout mounting.
 *   3. Pinned slug from localStorage, reconciled against `/my`. Pure
 *      sidebar UX state for cross-household / personal pages.
 *   4. Auto-pin if `/my` has exactly one household (derived only — NOT written
 *      to storage, so the auto-pin gracefully gives way when the user
 *      joins a second household).
 *   5. null.
 *
 * Side effects (all idempotent, no setState):
 *   - When the URL produces a slug that resolves in `/my`, write the
 *     storage pin so leaving to `/app` / `/app/me/*` preserves context.
 *   - When the pinned slug is stale (not in `/my`), clear it.
 */
export function ActiveHouseholdProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const userId = currentUser?.userId ?? null;
  const pathname = usePathname();
  const householdContext = useHouseholdOptional();
  const { data } = useQuery({
    ...listMyHouseholdsOptions(),
    enabled: Boolean(userId),
  });

  const households = useMemo(
    () => data?.households ?? [],
    [data?.households],
  );

  const pinnedSlug = usePinnedSlug(userId);
  const urlSlug = activeSlugFromPath(pathname);

  const resolved = useMemo<{
    activeHousehold: MyHouseholdItem | null;
    source: ActiveHouseholdValue["source"];
  }>(() => {
    // 1. HouseholdContext (set by household-shell layout) — authoritative when present.
    if (householdContext) {
      const fromMy = households.find(
        (o) => o.householdId === householdContext.householdId,
      );
      if (fromMy) {
        return { activeHousehold: fromMy, source: "context" };
      }
      // PlatformOverride: not a member, so not in `/my`. Synthesize a
      // minimal `MyHouseholdItem` so sidebar nav still renders.
      // `permissions` is deliberately empty — the user has none on a
      // per-household basis, they're acting via platform override.
      //
      // Permission-gated sidebar items must therefore use
      // `useCanInActiveHousehold(perm)` from `lib/active-household-permissions.ts`,
      // not a bare `<Can inHousehold=...>`. The helper consults
      // `HouseholdContext.accessMode` and grants override admins through;
      // raw `<Can>` would silently hide affordances they can use.
      return {
        activeHousehold: {
          householdId: householdContext.householdId,
          slug: householdContext.slug,
          name: householdContext.name,
          role: (householdContext.role ?? "") as HouseholdRole,
          permissions: [],
          permissionsVersion: "",
        },
        source: "context",
      };
    }

    // 2. URL slug.
    if (urlSlug) {
      const fromMy = households.find((o) => o.slug === urlSlug);
      if (fromMy) {
        return { activeHousehold: fromMy, source: "url" };
      }
    }

    // 3. Pinned slug.
    if (pinnedSlug) {
      const fromMy = households.find((o) => o.slug === pinnedSlug);
      if (fromMy) {
        return { activeHousehold: fromMy, source: "pinned" };
      }
    }

    // 4. Single-household auto-pin.
    if (households.length === 1) {
      return { activeHousehold: households[0], source: "auto" };
    }

    return { activeHousehold: null, source: "none" };
  }, [householdContext, urlSlug, pinnedSlug, households]);

  // URL → pin sync. Persist the in-URL slug so leaving the household tree
  // preserves the sidebar context. No setState — the storage write
  // notifies subscribers via `notifyStorageChange`.
  useEffect(() => {
    if (!userId) return;
    if (!urlSlug) return;
    const exists = households.some((o) => o.slug === urlSlug);
    if (!exists) return;
    if (urlSlug === pinnedSlug) return;
    writeActiveHouseholdSlug(userId, urlSlug);
    notifyStorageChange();
  }, [userId, urlSlug, households, pinnedSlug]);

  // Reconciliation: drop a pinned slug that's no longer in `/my` (household
  // deleted or membership removed). Gated on `data` being loaded so we
  // don't clear during the pre-fetch window.
  useEffect(() => {
    if (!userId) return;
    if (!data) return;
    if (!pinnedSlug) return;
    const exists = households.some((o) => o.slug === pinnedSlug);
    if (!exists) {
      clearActiveHouseholdSlug(userId);
      notifyStorageChange();
    }
  }, [userId, data, pinnedSlug, households]);

  const pin = useCallback(
    (slug: string) => {
      if (!userId) return;
      writeActiveHouseholdSlug(userId, slug);
      notifyStorageChange();
    },
    [userId],
  );

  const unpin = useCallback(() => {
    if (!userId) return;
    clearActiveHouseholdSlug(userId);
    notifyStorageChange();
  }, [userId]);

  const value = useMemo<ActiveHouseholdValue>(
    () => ({
      activeHousehold: resolved.activeHousehold,
      pin,
      unpin,
      source: resolved.source,
    }),
    [resolved.activeHousehold, resolved.source, pin, unpin],
  );

  return (
    <ActiveHouseholdContext.Provider value={value}>
      {children}
    </ActiveHouseholdContext.Provider>
  );
}
