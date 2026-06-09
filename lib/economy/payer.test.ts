import { describe, expect, it } from "vitest";

import type { HouseholdMemberItem } from "@/api/generated";

import { payerOptionsFromMembers, resolvePayerName } from "./payer";

function member(over: Partial<HouseholdMemberItem>): HouseholdMemberItem {
  return {
    userId: "u1",
    role: "member",
    joinedAt: "2026-01-01",
    isAnonymized: false,
    displayName: "Alex",
    email: "alex@example.com",
    ...over,
  };
}

describe("payerOptionsFromMembers", () => {
  it("includes members with an addressable identity", () => {
    const options = payerOptionsFromMembers([
      member({ userId: "u1", displayName: "Alex" }),
      member({ userId: "u2", displayName: "Sam" }),
    ]);
    expect(options).toEqual([
      { userId: "u1", displayName: "Alex" },
      { userId: "u2", displayName: "Sam" },
    ]);
  });

  it("excludes anonymized / userless members", () => {
    const options = payerOptionsFromMembers([
      member({ userId: "u1", displayName: "Alex" }),
      member({ userId: null, displayName: null, isAnonymized: true }),
    ]);
    expect(options).toHaveLength(1);
    expect(options[0].userId).toBe("u1");
  });
});

describe("resolvePayerName", () => {
  const members = [member({ userId: "u1", displayName: "Alex" })];

  it("returns null when there is no payer", () => {
    expect(resolvePayerName(members, null, "Unknown")).toBeNull();
    expect(resolvePayerName(members, undefined, "Unknown")).toBeNull();
  });

  it("resolves a known payer to their name", () => {
    expect(resolvePayerName(members, "u1", "Unknown")).toBe("Alex");
  });

  it("tombstones an unknown or erased payer", () => {
    expect(resolvePayerName(members, "gone", "Unknown")).toBe("Unknown");
    expect(
      resolvePayerName(
        [member({ userId: "u2", displayName: null, isAnonymized: true })],
        "u2",
        "Unknown",
      ),
    ).toBe("Unknown");
  });
});
