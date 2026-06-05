import { describe, expect, it } from "vitest";

import messages from "@/messages/en";

describe("messages/en", () => {
  it("exposes every namespace as a non-empty object", () => {
    for (const [name, value] of Object.entries(messages)) {
      expect(value, `${name} should be an object`).toBeTypeOf("object");
      expect(value, `${name} should not be null`).not.toBeNull();
      expect(
        Object.keys(value as Record<string, unknown>).length,
        `${name} should have at least one key`,
      ).toBeGreaterThan(0);
    }
  });
});
