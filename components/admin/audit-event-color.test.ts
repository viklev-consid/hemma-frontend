import { describe, expect, it } from "vitest";

import { auditEventColor } from "./audit-event-color";

describe("auditEventColor", () => {
  it("colors login and onboarding events green", () => {
    expect(auditEventColor("user.login")).toBe("bg-emerald-500");
    expect(auditEventColor("user.onboarding.completed")).toBe("bg-emerald-500");
    expect(auditEventColor("user.registered")).toBe("bg-emerald-500");
  });

  it("colors password events amber", () => {
    expect(auditEventColor("user.password.changed")).toBe("bg-amber-500");
  });

  it("colors role and invitation events sky", () => {
    expect(auditEventColor("user.role.changed")).toBe("bg-sky-500");
    expect(auditEventColor("invitation.sent")).toBe("bg-sky-500");
  });

  it("colors destructive events red", () => {
    expect(auditEventColor("user.deleted")).toBe("bg-red-500");
    expect(auditEventColor("invitation.revoked")).toBe("bg-red-500");
    expect(auditEventColor("worker.error")).toBe("bg-red-500");
  });

  it("falls back to muted for unknown events", () => {
    expect(auditEventColor("something.weird")).toBe("bg-muted-foreground");
  });

  it("is case-insensitive", () => {
    expect(auditEventColor("User.Login")).toBe("bg-emerald-500");
  });
});
