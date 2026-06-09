import { describe, expect, it } from "vitest";

import { isValidAnchorDate, todayAnchorDate } from "./anchor-date";

describe("isValidAnchorDate", () => {
  it("accepts a YYYY-MM-DD string", () => {
    expect(isValidAnchorDate("2026-06-09")).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isValidAnchorDate("2026/06/09")).toBe(false);
    expect(isValidAnchorDate("June 9")).toBe(false);
    expect(isValidAnchorDate("")).toBe(false);
  });
});

describe("todayAnchorDate", () => {
  it("formats local date parts as YYYY-MM-DD", () => {
    // Use a fixed local date to avoid timezone flakiness.
    const fixed = new Date(2026, 5, 9, 23, 30); // 9 June 2026, local time
    expect(todayAnchorDate(fixed)).toBe("2026-06-09");
  });

  it("zero-pads single-digit months and days", () => {
    const fixed = new Date(2026, 0, 5, 10, 0); // 5 Jan 2026
    expect(todayAnchorDate(fixed)).toBe("2026-01-05");
  });
});
