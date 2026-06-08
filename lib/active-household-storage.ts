"use client";

/**
 * Pin storage for the cross-app active household.
 *
 * The "active household" is sourced primarily from the URL (when the user is
 * inside `/app/h/<slug>/...`) and the HouseholdContext provided by the
 * household shell. When the URL doesn't supply a slug — on `/app`
 * (cross-household dashboard) or `/app/me/*` (personal scope) — we want the
 * sidebar to keep showing the user's previously selected household's
 * contextual nav. That's what this storage is for: a per-user "remember the
 * last household I was working in" hint.
 *
 * Conventions:
 * - Keyed by `userId` so Alice and Bob sharing a browser don't inherit each
 *   other's pin.
 * - SSR-safe: every reader/writer guards `typeof window`.
 * - Writes wrapped in try/catch — localStorage can throw on quota exhaustion
 *   or in private-browsing modes.
 * - This is a HINT, never a source of authority. Permission checks and data
 *   fetching key off the URL / HouseholdContext / `/my`, never this.
 *
 * If you find yourself reaching for the storage value from a permission
 * guard, you're using it wrong — read `useActiveHousehold()` from
 * `lib/active-household-context.ts` instead, which composes URL + storage +
 * `/my` reconciliation into a single answer.
 */

const STORAGE_KEY_PREFIX = "activeHouseholdSlug:";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function readActiveHouseholdSlug(
  userId: string | null | undefined,
): string | null {
  if (!userId) return null;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function writeActiveHouseholdSlug(
  userId: string | null | undefined,
  slug: string,
): void {
  if (!userId) return;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), slug);
  } catch {
    // Quota / private-browsing — silently drop. The pin is a UX hint,
    // not a correctness requirement.
  }
}

export function clearActiveHouseholdSlug(
  userId: string | null | undefined,
): void {
  if (!userId) return;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // Same rationale as writeActiveHouseholdSlug.
  }
}
