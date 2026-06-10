import { describe, expect, it } from "vitest";

import {
  parseAsScheduleYear,
  subscriptionBoardParsers,
  subscriptionMonthParsers,
} from "./subscription-filters";

describe("parseAsScheduleYear", () => {
  it("parses an in-bounds year", () => {
    expect(parseAsScheduleYear.parse("2026")).toBe(2026);
  });

  it("rejects out-of-bounds and non-numeric years", () => {
    expect(parseAsScheduleYear.parse("1999")).toBeNull();
    expect(parseAsScheduleYear.parse("99999")).toBeNull();
    expect(parseAsScheduleYear.parse("twenty")).toBeNull();
  });

  it("serializes back to a plain string", () => {
    expect(parseAsScheduleYear.serialize(2026)).toBe("2026");
  });
});

describe("subscriptionBoardParsers", () => {
  it("defaults chargePage to 1 and chargePageSize to the backend default", () => {
    expect(subscriptionBoardParsers.chargePage.defaultValue).toBe(1);
    expect(subscriptionBoardParsers.chargePageSize.defaultValue).toBe(50);
  });

  it("parses the expanded subscription id as a plain string", () => {
    expect(subscriptionBoardParsers.subscription.parse("abc-123")).toBe(
      "abc-123",
    );
  });
});

describe("subscriptionMonthParsers", () => {
  it("accepts only ISO anchor dates for ?month=", () => {
    expect(subscriptionMonthParsers.month.parse("2026-06-09")).toBe(
      "2026-06-09",
    );
    expect(subscriptionMonthParsers.month.parse("2026-06")).toBeNull();
  });
});
