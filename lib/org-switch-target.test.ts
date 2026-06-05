import { describe, expect, it } from "vitest";

import { orgSwitchTarget } from "@/lib/org-switch-target";

describe("orgSwitchTarget", () => {
  it("preserves org overview intent", () => {
    expect(orgSwitchTarget("/app/o/acme", "globex")).toBe("/app/o/globex");
  });

  it("preserves org sub-page intent", () => {
    expect(orgSwitchTarget("/app/o/acme/members", "globex")).toBe(
      "/app/o/globex/members",
    );
    expect(orgSwitchTarget("/app/o/acme/settings", "globex")).toBe(
      "/app/o/globex/settings",
    );
  });

  it("does not navigate away from cross-org or personal pages", () => {
    expect(orgSwitchTarget("/app", "globex")).toBeNull();
    expect(orgSwitchTarget("/app/me/settings", "globex")).toBeNull();
    expect(orgSwitchTarget("/app/notifications", "globex")).toBeNull();
  });
});
