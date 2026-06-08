import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearActiveHouseholdSlug,
  readActiveHouseholdSlug,
  writeActiveHouseholdSlug,
} from "@/lib/active-household-storage";

describe("active-household-storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns null when no value is stored", () => {
    expect(readActiveHouseholdSlug("user-1")).toBeNull();
  });

  it("returns null when userId is missing", () => {
    expect(readActiveHouseholdSlug(null)).toBeNull();
    expect(readActiveHouseholdSlug(undefined)).toBeNull();
    expect(readActiveHouseholdSlug("")).toBeNull();
  });

  it("roundtrips a slug for a user", () => {
    writeActiveHouseholdSlug("user-1", "acme");
    expect(readActiveHouseholdSlug("user-1")).toBe("acme");
  });

  it("keys per user so values do not leak across accounts", () => {
    writeActiveHouseholdSlug("user-1", "acme");
    writeActiveHouseholdSlug("user-2", "globex");
    expect(readActiveHouseholdSlug("user-1")).toBe("acme");
    expect(readActiveHouseholdSlug("user-2")).toBe("globex");
  });

  it("does not write when userId is missing", () => {
    writeActiveHouseholdSlug(null, "acme");
    writeActiveHouseholdSlug("", "acme");
    expect(window.localStorage.length).toBe(0);
  });

  it("clears a stored value", () => {
    writeActiveHouseholdSlug("user-1", "acme");
    clearActiveHouseholdSlug("user-1");
    expect(readActiveHouseholdSlug("user-1")).toBeNull();
  });

  it("swallows quota / access errors on write", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    expect(() => writeActiveHouseholdSlug("user-1", "acme")).not.toThrow();
    expect(setItem).toHaveBeenCalled();
  });

  it("swallows access errors on read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readActiveHouseholdSlug("user-1")).toBeNull();
  });

  it("swallows access errors on clear", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => clearActiveHouseholdSlug("user-1")).not.toThrow();
  });
});
