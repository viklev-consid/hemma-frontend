import { adminRoutes, type AdminRouteLabelKey } from "@/lib/admin-routes";
import {
  ECONOMY_NAV_ITEMS,
  PROPERTY_NAV_ITEMS,
} from "@/lib/household-sections";
import {
  settingsRoutes,
  type SettingsRouteLabelKey,
} from "@/lib/settings-routes";

/**
 * Breadcrumb trail resolver.
 *
 * The trail roots vary by scope:
 *   - Cross-app pages (`/app`, `/app/notifications`, `/app/households/new`) → Dashboard › ...
 *   - Inside a household (`/app/h/[slug]/*`)                       → <Household name> › ...
 *   - Personal pages (`/app/me/*`)                                → Account › ...
 *   - Admin pages (`/app/admin/*`)                                → Administration › ...
 *
 * Trails resolve in order — specific matchers must run before broader
 * `startsWith` catch-alls. Use the same href ladder pattern (parent +
 * leaf) so the chevron-separated chain stays clickable.
 *
 * Data-driven labels (the active household's name, a project's name) are
 * emitted as `{ ns: "dynamic" }` crumbs and resolved in `AppHeader` at render
 * time, since this resolver is a pure function of the pathname.
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
  | "householdsSettings"
  // Deep leaves under economy/property sections (the dynamic/nested pages that
  // have no sidebar nav entry of their own).
  | "economyTransactionNew"
  | "economyRecurringNew"
  | "economySubscriptionsYear"
  | "economySubscriptionsMonth"
  | "propertyProjectNew"
  | "propertyProjectDetail";

export type Crumb =
  | {
      ns: "app.shell.breadcrumb";
      key: ShellBreadcrumbKey;
      href?: string;
    }
  | {
      // Section labels (the household sub-app name), e.g. "Economy" / "Property".
      ns: "app.shell";
      key: "orgEconomy" | "orgProperty";
      href?: string;
    }
  | {
      // Section sub-pages — reuse the sidebar nav labels as the single source.
      ns: "economy.shell.nav" | "property.shell.nav";
      key: string;
      href?: string;
    }
  | {
      // Labels resolved at render time from live data, not i18n: the active
      // household's name and the current project's name. The header falls back
      // to an i18n string while the data loads.
      ns: "dynamic";
      key: "householdName" | "projectName";
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
    { ns: "dynamic", key: "householdName", href: `/app/h/${slug}` },
    { ns: "app.shell.breadcrumb", key: leafKey },
  ];
}

// Household sub-app sections (parallel to Economy). Each maps the section to its
// label key, the i18n namespace for its sub-pages, and the set of known sub-page
// segments (sourced from the sidebar nav so the two never drift).
const SECTION_CONFIG = {
  economy: {
    labelKey: "orgEconomy",
    navNs: "economy.shell.nav",
    paths: ECONOMY_NAV_ITEMS.map((item) => item.path),
  },
  property: {
    labelKey: "orgProperty",
    navNs: "property.shell.nav",
    paths: PROPERTY_NAV_ITEMS.map((item) => item.path),
  },
} as const;

type SectionKey = keyof typeof SECTION_CONFIG;

// Leaf labels for nested pages that have no sidebar nav entry, keyed by
// `${section}/${subPage}/${nestedSegment}`.
const SECTION_DEEP_LEAF: Record<string, ShellBreadcrumbKey> = {
  "economy/transactions/new": "economyTransactionNew",
  "economy/recurring/new": "economyRecurringNew",
  "economy/subscriptions/year": "economySubscriptionsYear",
  "economy/subscriptions/month": "economySubscriptionsMonth",
  "property/projects/new": "propertyProjectNew",
};

function sectionCrumbs(
  slug: string,
  section: SectionKey,
  rest: string[],
): Crumb[] {
  const base = `/app/h/${slug}`;
  const config = SECTION_CONFIG[section];
  const crumbs: Crumb[] = [{ ns: "dynamic", key: "householdName", href: base }];

  const sub = rest[0];
  const knownSub =
    sub !== undefined && (config.paths as readonly string[]).includes(sub);

  // Unknown / bare section (e.g. `/economy`, `/economy/setup`) → section is the
  // leaf with no further trail.
  if (!knownSub) {
    crumbs.push({ ns: "app.shell", key: config.labelKey });
    return crumbs;
  }

  const sectionHref = `${base}/${section}`;
  const subHref = `${sectionHref}/${sub}`;
  crumbs.push({ ns: "app.shell", key: config.labelKey, href: sectionHref });

  // Leaf sub-page (e.g. `/property/projects`).
  if (rest.length === 1) {
    crumbs.push({ ns: config.navNs, key: sub });
    return crumbs;
  }

  // Nested page (e.g. `/projects/new`, `/projects/:id`). The sub-page then links
  // back to its list and the nested page is the leaf.
  const deepLeaf = SECTION_DEEP_LEAF[`${section}/${sub}/${rest[1]}`];
  if (deepLeaf) {
    crumbs.push({ ns: config.navNs, key: sub, href: subHref });
    crumbs.push({ ns: "app.shell.breadcrumb", key: deepLeaf });
  } else if (section === "property" && sub === "projects") {
    // Project detail — leaf is the project's name, resolved from cache in the
    // header (falls back to a generic "Project" label while loading).
    crumbs.push({ ns: config.navNs, key: sub, href: subHref });
    crumbs.push({ ns: "dynamic", key: "projectName" });
  } else {
    // Unknown nested page → stop at the sub-page as the leaf.
    crumbs.push({ ns: config.navNs, key: sub });
  }
  return crumbs;
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
  // Household sub-app sections (economy / property): Dashboard › Household ›
  // Section › Sub-page [› nested]. Must precede the household catch-all below.
  {
    match: (p) => /^\/app\/h\/[^/]+\/(economy|property)(\/|$)/.test(p),
    build: (p) => {
      const m = p.match(/^\/app\/h\/([^/]+)\/(economy|property)(?:\/(.*))?$/);
      const slug = m?.[1] ?? "";
      const section = m?.[2] as SectionKey;
      const rest = m?.[3] ? m[3].split("/") : [];
      return sectionCrumbs(slug, section, rest);
    },
  },
  {
    match: (p) => p.startsWith("/app/h/"),
    build: () => [{ ns: "dynamic", key: "householdName" }],
  },
];

export function resolveBreadcrumb(pathname: string): Crumb[] {
  const match = trails.find((entry) => entry.match(pathname));
  return (
    match?.build(pathname) ?? [{ ns: "app.shell.breadcrumb", key: "dashboard" }]
  );
}
