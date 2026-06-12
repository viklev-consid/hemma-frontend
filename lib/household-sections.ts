/**
 * The contextual nav sections inside a household shell (`/app/h/[slug]/…`).
 *
 * Single source of truth shared by the sidebar (`components/app-shell/
 * household-nav.tsx`) and the breadcrumb resolver (`components/app-shell/
 * breadcrumb-config.ts`). Each item's `path` is the URL segment and `key` is
 * the i18n leaf under the section's `*.shell.nav` namespace (they're identical
 * by convention, but kept as a pair so the two uses read clearly).
 */

export const ECONOMY_NAV_ITEMS = [
  { key: "transactions", path: "transactions" },
  { key: "transfers", path: "transfers" },
  { key: "budget", path: "budget" },
  { key: "recurring", path: "recurring" },
  { key: "subscriptions", path: "subscriptions" },
  { key: "analytics", path: "analytics" },
  { key: "accounts", path: "accounts" },
  { key: "categories", path: "categories" },
  { key: "rules", path: "rules" },
  { key: "import", path: "import" },
  { key: "privacy", path: "privacy" },
] as const;

export const PROPERTY_NAV_ITEMS = [
  { key: "projects", path: "projects" },
  { key: "maintenance", path: "maintenance" },
  { key: "logbook", path: "logbook" },
] as const;
