import { describe, expect, it } from "vitest";

import { formatDateOnly, toDateOnly, todayDateOnly } from "./dates";

describe("formatDateOnly", () => {
  it("formats a YYYY-MM-DD string with the fixed sv-SE locale", () => {
    // sv-SE renders "11 juni 2026" (lowercase month, no comma).
    expect(formatDateOnly("2026-06-11")).toBe("11 juni 2026");
  });

  it("does not shift the day across timezones (parsed in UTC)", () => {
    // A date that would roll backwards if parsed as local midnight in a
    // negative-offset zone still renders as the stored day.
    expect(formatDateOnly("2026-01-01")).toBe("1 januari 2026");
  });

  it("returns empty string for nullish input", () => {
    expect(formatDateOnly(null)).toBe("");
    expect(formatDateOnly(undefined)).toBe("");
    expect(formatDateOnly("")).toBe("");
  });

  it("returns the raw value verbatim when not a DateOnly", () => {
    expect(formatDateOnly("2026-06-11T10:00:00Z")).toBe("2026-06-11T10:00:00Z");
    expect(formatDateOnly("not-a-date")).toBe("not-a-date");
  });
});

describe("toDateOnly", () => {
  it("formats from local date parts, zero-padded", () => {
    // Construct via local parts so the test is timezone-stable.
    expect(toDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateOnly(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("todayDateOnly", () => {
  it("round-trips a provided date", () => {
    const d = new Date(2026, 5, 11);
    expect(todayDateOnly(d)).toBe("2026-06-11");
  });
});
