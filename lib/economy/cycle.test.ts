import { describe, expect, it } from "vitest";

import {
  CYCLE_START_DAY_MAX,
  CYCLE_START_DAY_MIN,
  cycleStartDayOptions,
  isValidCycleStartDay,
} from "./cycle";

describe("isValidCycleStartDay", () => {
  it("accepts whole numbers within 1–28", () => {
    expect(isValidCycleStartDay(CYCLE_START_DAY_MIN)).toBe(true);
    expect(isValidCycleStartDay(15)).toBe(true);
    expect(isValidCycleStartDay(CYCLE_START_DAY_MAX)).toBe(true);
  });

  it("rejects out-of-range and non-integer values", () => {
    expect(isValidCycleStartDay(0)).toBe(false);
    expect(isValidCycleStartDay(29)).toBe(false);
    expect(isValidCycleStartDay(31)).toBe(false);
    expect(isValidCycleStartDay(14.5)).toBe(false);
    expect(isValidCycleStartDay(Number.NaN)).toBe(false);
  });
});

describe("cycleStartDayOptions", () => {
  it("lists every day from 1 to 28 inclusive", () => {
    const options = cycleStartDayOptions();
    expect(options).toHaveLength(28);
    expect(options[0]).toBe(1);
    expect(options.at(-1)).toBe(28);
  });
});
