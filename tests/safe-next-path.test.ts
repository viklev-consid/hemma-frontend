import { describe, expect, it } from "vitest";

import { safeNextPath, DEFAULT_NEXT_PATH } from "@/lib/safe-next-path";

describe("safeNextPath", () => {
  it("returns the fallback for null or empty input", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath(undefined)).toBe(DEFAULT_NEXT_PATH);
  });

  it("returns the fallback for non-root paths", () => {
    expect(safeNextPath("evil.com/path")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("https://evil.com")).toBe(DEFAULT_NEXT_PATH);
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.com")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("/\\evil.com")).toBe(DEFAULT_NEXT_PATH);
  });

  it("rejects internal API and auth prefixes", () => {
    expect(safeNextPath("/api/proxy/x")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("/auth/anything")).toBe(DEFAULT_NEXT_PATH);
  });

  it("preserves a path with a query string", () => {
    expect(safeNextPath("/confirm-email-change?token=abc")).toBe(
      "/confirm-email-change?token=abc",
    );
  });

  it("preserves a path with multiple query params", () => {
    expect(safeNextPath("/app/me/settings?tab=email&from=invite")).toBe(
      "/app/me/settings?tab=email&from=invite",
    );
  });

  it("returns the value as-is for a safe app path", () => {
    expect(safeNextPath("/app/notifications")).toBe("/app/notifications");
  });
});
