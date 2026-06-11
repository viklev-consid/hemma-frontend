import { describe, expect, it } from "vitest";

import economy from "@/messages/en/economy.json";

/**
 * Phase 7 is accuracy-first: the privacy disclosure must never overclaim. These
 * three statements are false against the backend as shipped (2026-06-11):
 * sensitive economy fields are NOT encrypted at rest, and the GDPR export is
 * self-scoped (`payerId == currentUserId`) — never a household-wide owner dump.
 * The forbidden list is a hard constraint from the source plan, encoded here so
 * a future copy edit can't quietly reintroduce an overclaim.
 */
const FORBIDDEN = [
  "we cannot see your financial data",
  "all sensitive fields are encrypted",
  "household owners can export all members",
];

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
  } else if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, out);
    }
  }
}

describe("economy.privacy copy", () => {
  const strings: string[] = [];
  collectStrings(economy.privacy, strings);
  const haystack = strings.join("\n").toLowerCase();

  it("contains the disclosure tree", () => {
    expect(strings.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)("does not overclaim: %s", (phrase) => {
    expect(haystack).not.toContain(phrase);
  });

  it("keeps the encryption status line as a single flippable key", () => {
    // The encryption claim is a manual release-time copy switch (no runtime
    // flag) — it must live in exactly one key so flipping it when field
    // encryption ships is a one-line change.
    expect(economy.privacy.encryption.status).toContain(
      "aren't encrypted at rest yet",
    );
  });
});
