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

  it("returns Dashboard › Household for /app/h/:slug", () => {
    expect(resolveBreadcrumb("/app/h/acme")).toEqual([
      { ns: "app.shell.breadcrumb", key: "dashboard", href: "/app" },
      { ns: "app.shell.breadcrumb", key: "householdsActive" },
    ]);
  });

  it.each([
    ["members", "householdsMembers"],
    ["invitations", "householdsInvitations"],
    ["audit", "householdsAudit"],
    ["settings", "householdsSettings"],
  ])(
    "returns Dashboard › Household › leaf for /app/h/:slug/%s",
    (segment, key) => {
      expect(resolveBreadcrumb(`/app/h/acme/${segment}`)).toEqual([
        { ns: "app.shell.breadcrumb", key: "dashboard", href: "/app" },
        {
          ns: "app.shell.breadcrumb",
          key: "householdsActive",
          href: "/app/h/acme",
        },
        { ns: "app.shell.breadcrumb", key },
      ]);
    },
  );

  it("falls back to Dashboard for unknown paths", () => {
    expect(resolveBreadcrumb("/somewhere/else")).toEqual([
      { ns: "app.shell.breadcrumb", key: "dashboard" },
    ]);
  });
});
