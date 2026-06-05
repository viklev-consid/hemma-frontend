import { describe, expect, it } from "vitest";

import { isValidSlug, suggestSlug } from "./slug";

describe("isValidSlug", () => {
  it("accepts lowercase alphanumerics", () => {
    expect(isValidSlug("acme")).toBe(true);
    expect(isValidSlug("acme123")).toBe(true);
  });

  it("accepts single hyphens between segments", () => {
    expect(isValidSlug("acme-corp")).toBe(true);
    expect(isValidSlug("a-b-c")).toBe(true);
  });

  it("rejects leading or trailing hyphens", () => {
    expect(isValidSlug("-acme")).toBe(false);
    expect(isValidSlug("acme-")).toBe(false);
  });

  it("rejects consecutive hyphens", () => {
    expect(isValidSlug("acme--corp")).toBe(false);
  });

  it("rejects uppercase and special characters", () => {
    expect(isValidSlug("Acme")).toBe(false);
    expect(isValidSlug("acme_corp")).toBe(false);
    expect(isValidSlug("acme corp")).toBe(false);
  });

  it("rejects empty and over-length", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("a".repeat(101))).toBe(false);
  });
});

describe("suggestSlug", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(suggestSlug("Acme Corp")).toBe("acme-corp");
  });

  it("collapses non-alphanumerics and trims hyphens", () => {
    expect(suggestSlug("  Acme, Inc. ")).toBe("acme-inc");
    expect(suggestSlug("Acme—Corp")).toBe("acme-corp");
  });

  it("returns empty for input without usable characters", () => {
    expect(suggestSlug("---")).toBe("");
  });

  it("truncates to max length", () => {
    expect(suggestSlug("a".repeat(150)).length).toBeLessThanOrEqual(100);
  });
});
