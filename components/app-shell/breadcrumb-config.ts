import { adminRoutes, type AdminRouteLabelKey } from "@/lib/admin-routes";
import {
  settingsRoutes,
  type SettingsRouteLabelKey,
} from "@/lib/settings-routes";

/**
 * Breadcrumb trail resolver.
 *
 * The trail roots vary by scope:
 *   - Cross-household pages (`/app`, `/app/notifications`, household pages)   → Dashboard › ...
 *   - Personal pages (`/app/me/*`)                                → Account › ...
 *   - Admin pages (`/app/admin/*`)                                → Administration › ...
 *
 * Trails resolve in order — specific matchers must run before broader
 * `startsWith` catch-alls. Use the same href ladder pattern (parent +
 * leaf) so the chevron-separated chain stays clickable.
 *
 * Household pages currently render a static "Household" label rather than
 * the actual household name. Plumbing the dynamic name through would require
 * either a hook variant of this resolver or shape changes to the Crumb
 * type; deferred until there's product pressure for it.
 */
type ShellBreadcrumbKey =
  | "dashboard"
  | "account"
  | "settings"
  | "administration"
  | "notifications"
  | "householdsNew"
  | "householdsActive"
  | "householdsMembers"
  | "householdsInvitations"
  | "householdsAudit"
  | "householdsSettings";

export type Crumb =
  | {
      ns: "app.shell.breadcrumb";
      key: ShellBreadcrumbKey;
      href?: string;
    }
  | {
      ns: "settings.nav";
      key: SettingsRouteLabelKey;
      href?: string;
    }
  | {
      ns: "admin.nav";
      key: AdminRouteLabelKey;
      href?: string;
    };

type Trail = {
  match: (path: string) => boolean;
  build: (path: string) => Crumb[];
};

const HOUSEHOLD_SUB_PAGES: ReadonlyArray<[string, ShellBreadcrumbKey]> = [
  ["members", "householdsMembers"],
  ["invitations", "householdsInvitations"],
  ["audit", "householdsAudit"],
  ["settings", "householdsSettings"],
];

function householdSubPageCrumbs(
  slug: string,
  leafKey: ShellBreadcrumbKey,
): Crumb[] {
  return [
    { ns: "app.shell.breadcrumb", key: "dashboard", href: "/app" },
    {
      ns: "app.shell.breadcrumb",
      key: "householdsActive",
      href: `/app/h/${slug}`,
    },
    { ns: "app.shell.breadcrumb", key: leafKey },
  ];
}

const trails: Trail[] = [
  {
    match: (p) => p === "/app",
    build: () => [{ ns: "app.shell.breadcrumb", key: "dashboard" }],
  },
  {
    match: (p) => p === "/app/notifications",
    build: () => [
      { ns: "app.shell.breadcrumb", key: "dashboard", href: "/app" },
      { ns: "app.shell.breadcrumb", key: "notifications" },
    ],
  },
  {
    match: (p) => p === "/app/me" || p === "/app/me/settings",
    build: () => [
      { ns: "app.shell.breadcrumb", key: "account", href: "/app/me" },
      { ns: "app.shell.breadcrumb", key: "settings" },
    ],
  },
  ...settingsRoutes.map<Trail>((route) => ({
    match: (p) => p === route.href,
    build: () => [
      { ns: "app.shell.breadcrumb", key: "account", href: "/app/me" },
      {
        ns: "app.shell.breadcrumb",
        key: "settings",
        href: "/app/me/settings",
      },
      { ns: "settings.nav", key: route.labelKey },
    ],
  })),
  ...adminRoutes.map<Trail>((route) => ({
    match: (p) => p === route.href || p.startsWith(`${route.href}/`),
    build: () => [
      {
        ns: "app.shell.breadcrumb",
        key: "administration",
        href: "/app/admin",
      },
      { ns: "admin.nav", key: route.labelKey },
    ],
  })),
  {
    match: (p) => p === "/app/admin",
    build: () => [{ ns: "app.shell.breadcrumb", key: "administration" }],
  },
  {
    match: (p) => p === "/app/households/new",
    build: () => [
      { ns: "app.shell.breadcrumb", key: "dashboard", href: "/app" },
      { ns: "app.shell.breadcrumb", key: "householdsNew" },
    ],
  },
  // Per-household sub-pages. Each leaf links the parent overview so the trail
  // reads Dashboard › Household › Members. Order matters: these
  // specific suffix matchers must run before the catch-all household-overview
  // entry below.
  ...HOUSEHOLD_SUB_PAGES.map<Trail>(([segment, key]) => ({
    match: (p) => {
      const m = p.match(/^\/app\/h\/([^/]+)\/([^/]+)$/);
      return m !== null && m[2] === segment;
    },
    build: (p) => {
      const m = p.match(/^\/app\/h\/([^/]+)\//);
      return householdSubPageCrumbs(m?.[1] ?? "", key);
    },
  })),
  {
    match: (p) => p.startsWith("/app/h/"),
    build: () => [
      { ns: "app.shell.breadcrumb", key: "dashboard", href: "/app" },
      { ns: "app.shell.breadcrumb", key: "householdsActive" },
    ],
  },
];

export function resolveBreadcrumb(pathname: string): Crumb[] {
  const match = trails.find((entry) => entry.match(pathname));
  return (
    match?.build(pathname) ?? [{ ns: "app.shell.breadcrumb", key: "dashboard" }]
  );
}
