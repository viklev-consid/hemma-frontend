const HOUSEHOLD_ROUTE_RE = /^\/app\/h\/([^/]+)(\/.*)?$/;

/**
 * Resolve where selecting a different household should take the user.
 *
 * Household-scoped routes preserve the current sub-page. Cross-household,
 * personal, admin, and other global routes keep the user where they are;
 * selecting a household only updates the app-level active context there.
 */
export function householdSwitchTarget(
  pathname: string,
  nextSlug: string,
): string | null {
  const match = pathname.match(HOUSEHOLD_ROUTE_RE);
  if (!match) return null;

  const suffix = match[2] ?? "";
  return `/app/h/${nextSlug}${suffix}`;
}
