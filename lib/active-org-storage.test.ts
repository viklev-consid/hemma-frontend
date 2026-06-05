import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearActiveOrgSlug,
  readActiveOrgSlug,
  writeActiveOrgSlug,
} from "@/lib/active-org-storage";

describe("active-org-storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns null when no value is stored", () => {
    expect(readActiveOrgSlug("user-1")).toBeNull();
  });

  it("returns null when userId is missing", () => {
    expect(readActiveOrgSlug(null)).toBeNull();
    expect(readActiveOrgSlug(undefined)).toBeNull();
    expect(readActiveOrgSlug("")).toBeNull();
  });

  it("roundtrips a slug for a user", () => {
    writeActiveOrgSlug("user-1", "acme");
    expect(readActiveOrgSlug("user-1")).toBe("acme");
  });

  it("keys per user so values do not leak across accounts", () => {
    writeActiveOrgSlug("user-1", "acme");
    writeActiveOrgSlug("user-2", "globex");
    expect(readActiveOrgSlug("user-1")).toBe("acme");
    expect(readActiveOrgSlug("user-2")).toBe("globex");
  });

  it("does not write when userId is missing", () => {
    writeActiveOrgSlug(null, "acme");
    writeActiveOrgSlug("", "acme");
    expect(window.localStorage.length).toBe(0);
  });

  it("clears a stored value", () => {
    writeActiveOrgSlug("user-1", "acme");
    clearActiveOrgSlug("user-1");
    expect(readActiveOrgSlug("user-1")).toBeNull();
  });

  it("swallows quota / access errors on write", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    expect(() => writeActiveOrgSlug("user-1", "acme")).not.toThrow();
    expect(setItem).toHaveBeenCalled();
  });

  it("swallows access errors on read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readActiveOrgSlug("user-1")).toBeNull();
  });

  it("swallows access errors on clear", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => clearActiveOrgSlug("user-1")).not.toThrow();
  });
});
