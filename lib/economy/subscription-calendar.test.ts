import { describe, expect, it } from "vitest";

import {
  addMonthsAnchor,
  currentYear,
  DEFAULT_CHARGE_PAGE_SIZE,
  formatMonthHeading,
  formatMonthNumber,
  isValidScheduleYear,
} from "./subscription-calendar";

describe("DEFAULT_CHARGE_PAGE_SIZE", () => {
  it("mirrors the backend default", () => {
    expect(DEFAULT_CHARGE_PAGE_SIZE).toBe(50);
  });
});

describe("currentYear", () => {
  it("derives the year from a local date", () => {
    expect(currentYear(new Date(2026, 5, 10))).toBe(2026);
  });

  it("uses local time, not UTC (late New Year's Eve stays in the old year)", () => {
    // 2026-12-31 23:30 local — toISOString() could already say 2027.
    expect(currentYear(new Date(2026, 11, 31, 23, 30))).toBe(2026);
  });
});

describe("isValidScheduleYear", () => {
  it("accepts whole years within bounds", () => {
    expect(isValidScheduleYear(2026)).toBe(true);
    expect(isValidScheduleYear(2000)).toBe(true);
    expect(isValidScheduleYear(2100)).toBe(true);
  });

  it("rejects out-of-bounds and fractional values", () => {
    expect(isValidScheduleYear(1999)).toBe(false);
    expect(isValidScheduleYear(2101)).toBe(false);
    expect(isValidScheduleYear(2026.5)).toBe(false);
  });
});

describe("formatMonthNumber", () => {
  it("labels a month number in the Swedish locale", () => {
    expect(formatMonthNumber(1)).toMatch(/jan/i);
    expect(formatMonthNumber(12)).toMatch(/dec/i);
  });

  it("coerces string month numbers from the contract", () => {
    expect(formatMonthNumber("6")).toMatch(/jun/i);
  });

  it("falls back to the raw value when out of range", () => {
    expect(formatMonthNumber(0)).toBe("0");
    expect(formatMonthNumber(13)).toBe("13");
    expect(formatMonthNumber("nope")).toBe("nope");
  });
});

describe("formatMonthHeading", () => {
  it("renders month + year from an anchor date", () => {
    expect(formatMonthHeading("2026-06-15")).toBe("juni 2026");
  });

  it("falls back to the raw string when unparsable", () => {
    expect(formatMonthHeading("not-a-date")).toBe("not-a-date");
  });
});

describe("addMonthsAnchor", () => {
  it("steps to the first day of the next month", () => {
    expect(addMonthsAnchor("2026-06-15", 1)).toBe("2026-07-01");
  });

  it("steps backwards across a year boundary", () => {
    expect(addMonthsAnchor("2026-01-20", -1)).toBe("2025-12-01");
  });

  it("does not skip short months from an end-of-month anchor", () => {
    expect(addMonthsAnchor("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("falls back to the input when unparsable", () => {
    expect(addMonthsAnchor("junk", 1)).toBe("junk");
  });
});
