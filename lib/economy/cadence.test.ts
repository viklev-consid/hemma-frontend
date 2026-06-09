import { describe, expect, it } from "vitest";

import {
  CADENCE_INTERVAL_MAX,
  CADENCE_INTERVAL_MIN,
  cadenceDayOptions,
  cadenceIntervalOptions,
  formatCadence,
  isValidCadenceInterval,
} from "./cadence";

// A minimal stand-in for next-intl's `t` — echoes the key plus interpolated
// values so assertions can read both without pulling in the i18n runtime.
const t = (key: string, values?: Record<string, string | number>) =>
  values
    ? `${key}:${Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(",")}`
    : key;

describe("isValidCadenceInterval", () => {
  it("accepts whole numbers within 1–12", () => {
    expect(isValidCadenceInterval(CADENCE_INTERVAL_MIN)).toBe(true);
    expect(isValidCadenceInterval(6)).toBe(true);
    expect(isValidCadenceInterval(CADENCE_INTERVAL_MAX)).toBe(true);
  });

  it("rejects out-of-range and non-integer values", () => {
    expect(isValidCadenceInterval(0)).toBe(false);
    expect(isValidCadenceInterval(13)).toBe(false);
    expect(isValidCadenceInterval(1.5)).toBe(false);
    expect(isValidCadenceInterval(Number.NaN)).toBe(false);
  });
});

describe("cadenceIntervalOptions", () => {
  it("lists every interval from 1 to 12 inclusive", () => {
    const options = cadenceIntervalOptions();
    expect(options).toHaveLength(12);
    expect(options[0]).toBe(1);
    expect(options.at(-1)).toBe(12);
  });
});

describe("cadenceDayOptions", () => {
  it("lists every day from 1 to 28 inclusive (mirrors the cycle bound)", () => {
    const options = cadenceDayOptions();
    expect(options).toHaveLength(28);
    expect(options[0]).toBe(1);
    expect(options.at(-1)).toBe(28);
  });
});

describe("formatCadence", () => {
  it("uses the singular form for an interval of 1", () => {
    expect(
      formatCadence(
        {
          cadenceFrequency: "Monthly",
          cadenceInterval: 1,
          cadenceDayOfMonth: 25,
        },
        t,
      ),
    ).toBe("monthly.one:day=25");
  });

  it("uses the plural form for an interval greater than 1", () => {
    expect(
      formatCadence(
        {
          cadenceFrequency: "Monthly",
          cadenceInterval: 2,
          cadenceDayOfMonth: 1,
        },
        t,
      ),
    ).toBe("monthly.many:interval=2,day=1");
  });
});
