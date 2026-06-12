import { describe, expect, it } from "vitest";

import { resolveBreadcrumb } from "@/components/app-shell/breadcrumb-config";

describe("resolveBreadcrumb", () => {
  it("returns Dashboard for /app", () => {
    expect(resolveBreadcrumb("/app")).toEqual([
      { ns: "app.shell.breadcrumb", key: "dashboard" },
    ]);
  });

  it("returns Dashboard › Notifications for /app/notifications", () => {
    expect(resolveBreadcrumb("/app/notifications")).toEqual([
      { ns: "app.shell.breadcrumb", key: "dashboard", href: "/app" },
      { ns: "app.shell.breadcrumb", key: "notifications" },
    ]);
  });

  it("returns Account › Settings for /app/me/settings", () => {
    expect(resolveBreadcrumb("/app/me/settings")).toEqual([
      { ns: "app.shell.breadcrumb", key: "account", href: "/app/me" },
      { ns: "app.shell.breadcrumb", key: "settings" },
    ]);
  });

  it("returns Account › Settings › Password for /app/me/settings/password", () => {
    expect(resolveBreadcrumb("/app/me/settings/password")).toEqual([
      { ns: "app.shell.breadcrumb", key: "account", href: "/app/me" },
      { ns: "app.shell.breadcrumb", key: "settings", href: "/app/me/settings" },
      { ns: "settings.nav", key: "password" },
    ]);
  });

  it("returns Administration › Users for /app/admin/users", () => {
    expect(resolveBreadcrumb("/app/admin/users")).toEqual([
      {
        ns: "app.shell.breadcrumb",
        key: "administration",
        href: "/app/admin",
      },
      { ns: "admin.nav", key: "users" },
    ]);
  });

  it("returns Administration › Users for nested /app/admin/users/[id]", () => {
    expect(resolveBreadcrumb("/app/admin/users/abc-123")).toEqual([
      {
        ns: "app.shell.breadcrumb",
        key: "administration",
        href: "/app/admin",
      },
      { ns: "admin.nav", key: "users" },
    ]);
  });

  it("returns Dashboard › Create household for /app/households/new", () => {
    expect(resolveBreadcrumb("/app/households/new")).toEqual([
      { ns: "app.shell.breadcrumb", key: "dashboard", href: "/app" },
      { ns: "app.shell.breadcrumb", key: "householdsNew" },
    ]);
  });

  it("returns the household name (no Dashboard) for /app/h/:slug", () => {
    expect(resolveBreadcrumb("/app/h/acme")).toEqual([
      { ns: "dynamic", key: "householdName" },
    ]);
  });

  it.each([
    ["members", "householdsMembers"],
    ["invitations", "householdsInvitations"],
    ["audit", "householdsAudit"],
    ["settings", "householdsSettings"],
  ])("returns Household › leaf for /app/h/:slug/%s", (segment, key) => {
    expect(resolveBreadcrumb(`/app/h/acme/${segment}`)).toEqual([
      { ns: "dynamic", key: "householdName", href: "/app/h/acme" },
      { ns: "app.shell.breadcrumb", key },
    ]);
  });

  it("returns Household › Property › Projects for a property list page", () => {
    expect(resolveBreadcrumb("/app/h/acme/property/projects")).toEqual([
      { ns: "dynamic", key: "householdName", href: "/app/h/acme" },
      { ns: "app.shell", key: "orgProperty", href: "/app/h/acme/property" },
      { ns: "property.shell.nav", key: "projects" },
    ]);
  });

  it("links the sub-page and uses a project-name leaf for a project detail", () => {
    expect(resolveBreadcrumb("/app/h/acme/property/projects/abc-123")).toEqual([
      { ns: "dynamic", key: "householdName", href: "/app/h/acme" },
      { ns: "app.shell", key: "orgProperty", href: "/app/h/acme/property" },
      {
        ns: "property.shell.nav",
        key: "projects",
        href: "/app/h/acme/property/projects",
      },
      { ns: "dynamic", key: "projectName" },
    ]);
  });

  it("uses a named leaf for property project create", () => {
    expect(resolveBreadcrumb("/app/h/acme/property/projects/new")).toEqual([
      { ns: "dynamic", key: "householdName", href: "/app/h/acme" },
      { ns: "app.shell", key: "orgProperty", href: "/app/h/acme/property" },
      {
        ns: "property.shell.nav",
        key: "projects",
        href: "/app/h/acme/property/projects",
      },
      { ns: "app.shell.breadcrumb", key: "propertyProjectNew" },
    ]);
  });

  it("returns Household › Economy › Transactions for an economy page", () => {
    expect(resolveBreadcrumb("/app/h/acme/economy/transactions")).toEqual([
      { ns: "dynamic", key: "householdName", href: "/app/h/acme" },
      { ns: "app.shell", key: "orgEconomy", href: "/app/h/acme/economy" },
      { ns: "economy.shell.nav", key: "transactions" },
    ]);
  });

  it("adds a named leaf for a nested economy page", () => {
    expect(resolveBreadcrumb("/app/h/acme/economy/subscriptions/year")).toEqual(
      [
        { ns: "dynamic", key: "householdName", href: "/app/h/acme" },
        { ns: "app.shell", key: "orgEconomy", href: "/app/h/acme/economy" },
        {
          ns: "economy.shell.nav",
          key: "subscriptions",
          href: "/app/h/acme/economy/subscriptions",
        },
        { ns: "app.shell.breadcrumb", key: "economySubscriptionsYear" },
      ],
    );
  });

  it("treats a bare section as the leaf", () => {
    expect(resolveBreadcrumb("/app/h/acme/property")).toEqual([
      { ns: "dynamic", key: "householdName", href: "/app/h/acme" },
      { ns: "app.shell", key: "orgProperty" },
    ]);
  });

  it("stops at the section for an unknown sub-page (e.g. economy setup)", () => {
    expect(resolveBreadcrumb("/app/h/acme/economy/setup")).toEqual([
      { ns: "dynamic", key: "householdName", href: "/app/h/acme" },
      { ns: "app.shell", key: "orgEconomy" },
    ]);
  });

  it("falls back to Dashboard for unknown paths", () => {
    expect(resolveBreadcrumb("/somewhere/else")).toEqual([
      { ns: "app.shell.breadcrumb", key: "dashboard" },
    ]);
  });
});
