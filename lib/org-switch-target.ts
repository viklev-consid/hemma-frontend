const ORG_ROUTE_RE = /^\/app\/o\/([^/]+)(\/.*)?$/;

/**
 * Resolve where selecting a different organization should take the user.
 *
 * Org-scoped routes preserve the current sub-page. Cross-org, personal,
 * admin, and other global routes keep the user where they are; selecting
 * an org only updates the app-level active context there.
 */
export function orgSwitchTarget(
  pathname: string,
  nextSlug: string,
): string | null {
  const match = pathname.match(ORG_ROUTE_RE);
  if (!match) return null;

  const suffix = match[2] ?? "";
  return `/app/o/${nextSlug}${suffix}`;
}
