import { describe, expect, it } from "vitest";

import { householdSwitchTarget } from "@/lib/household-switch-target";

describe("householdSwitchTarget", () => {
  it("preserves household overview intent", () => {
    expect(householdSwitchTarget("/app/h/acme", "globex")).toBe("/app/h/globex");
  });

  it("preserves household sub-page intent", () => {
    expect(householdSwitchTarget("/app/h/acme/members", "globex")).toBe(
      "/app/h/globex/members",
    );
    expect(householdSwitchTarget("/app/h/acme/settings", "globex")).toBe(
      "/app/h/globex/settings",
    );
  });

  it("does not navigate away from cross-household or personal pages", () => {
    expect(householdSwitchTarget("/app", "globex")).toBeNull();
    expect(householdSwitchTarget("/app/me/settings", "globex")).toBeNull();
    expect(householdSwitchTarget("/app/notifications", "globex")).toBeNull();
  });
});
