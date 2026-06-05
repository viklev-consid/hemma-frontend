"use client";

/**
 * Pin storage for the cross-app active org.
 *
 * The "active org" is sourced primarily from the URL (when the user is
 * inside `/app/o/<slug>/...`) and the OrgContext provided by the org
 * shell. When the URL doesn't supply a slug — on `/app` (cross-org
 * dashboard) or `/app/me/*` (personal scope) — we want the sidebar to
 * keep showing the user's previously selected org's contextual nav.
 * That's what this storage is for: a per-user "remember the last org I
 * was working in" hint.
 *
 * Conventions:
 * - Keyed by `userId` so Alice and Bob sharing a browser don't inherit
 *   each other's pin.
 * - SSR-safe: every reader/writer guards `typeof window`.
 * - Writes wrapped in try/catch — localStorage can throw on quota
 *   exhaustion or in private-browsing modes.
 * - This is a HINT, never a source of authority. Permission checks and
 *   data fetching key off the URL / OrgContext / `/my`, never this.
 *
 * If you find yourself reaching for the storage value from a permission
 * guard, you're using it wrong — read `useActiveOrg()` from
 * `lib/active-org-context.ts` instead, which composes URL + storage +
 * `/my` reconciliation into a single answer.
 */

const STORAGE_KEY_PREFIX = "activeOrgSlug:";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function readActiveOrgSlug(
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

export function writeActiveOrgSlug(
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

export function clearActiveOrgSlug(userId: string | null | undefined): void {
  if (!userId) return;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // Same rationale as writeActiveOrgSlug.
  }
}
