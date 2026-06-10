import { describe, expect, it } from "vitest";

import type { CadenceMessageKey } from "./cadence";
import {
  formatSubscriptionCadence,
  isTerminal,
  isValidSubscriptionInterval,
  SUBSCRIPTION_INTERVAL_MAX,
  SUBSCRIPTION_INTERVAL_MIN,
  SUBSCRIPTION_LIFECYCLE_STATE,
  SUBSCRIPTION_MATCH_STATE,
  subscriptionChargeDayOptions,
  subscriptionIntervalOptions,
} from "./subscription";

describe("SUBSCRIPTION_LIFECYCLE_STATE", () => {
  it("matches the backend's PascalCase enum exactly", () => {
    expect(Object.values(SUBSCRIPTION_LIFECYCLE_STATE)).toEqual([
      "Trial",
      "Active",
      "Paused",
      "Cancelled",
    ]);
  });
});

describe("SUBSCRIPTION_MATCH_STATE", () => {
  it("matches the backend's lowercase enum exactly (not PascalCase)", () => {
    expect(Object.values(SUBSCRIPTION_MATCH_STATE)).toEqual([
      "actual",
      "predicted",
      "suggested",
    ]);
  });
});

describe("isTerminal", () => {
  it("treats only Cancelled as terminal", () => {
    expect(isTerminal(SUBSCRIPTION_LIFECYCLE_STATE.Cancelled)).toBe(true);
    expect(isTerminal(SUBSCRIPTION_LIFECYCLE_STATE.Trial)).toBe(false);
    expect(isTerminal(SUBSCRIPTION_LIFECYCLE_STATE.Active)).toBe(false);
    expect(isTerminal(SUBSCRIPTION_LIFECYCLE_STATE.Paused)).toBe(false);
  });
});

describe("subscriptionIntervalOptions", () => {
  it("spans 1–24 (wider than the bills' 1–12)", () => {
    const options = subscriptionIntervalOptions();
    expect(options).toHaveLength(24);
    expect(options[0]).toBe(SUBSCRIPTION_INTERVAL_MIN);
    expect(options.at(-1)).toBe(SUBSCRIPTION_INTERVAL_MAX);
  });
});

describe("isValidSubscriptionInterval", () => {
  it("accepts whole numbers in 1–24", () => {
    expect(isValidSubscriptionInterval(1)).toBe(true);
    expect(isValidSubscriptionInterval(24)).toBe(true);
  });

  it("rejects out-of-range and fractional values", () => {
    expect(isValidSubscriptionInterval(0)).toBe(false);
    expect(isValidSubscriptionInterval(25)).toBe(false);
    expect(isValidSubscriptionInterval(1.5)).toBe(false);
  });
});

describe("subscriptionChargeDayOptions", () => {
  it("spans 1–28 (a day that exists in every month)", () => {
    const options = subscriptionChargeDayOptions();
    expect(options[0]).toBe(1);
    expect(options.at(-1)).toBe(28);
    expect(options).toHaveLength(28);
  });
});

describe("formatSubscriptionCadence", () => {
  const t = (
    key: CadenceMessageKey,
    values?: Record<string, string | number>,
  ) => `${key}:${values?.interval ?? ""}:${values?.day ?? ""}`;

  it("uses the singular form for interval 1", () => {
    expect(
      formatSubscriptionCadence(
        { cadenceFrequency: "Monthly", cadenceInterval: 1, chargeDay: 25 },
        t,
      ),
    ).toBe("monthly.one::25");
  });

  it("uses the plural form and coerces a string chargeDay", () => {
    expect(
      formatSubscriptionCadence(
        { cadenceFrequency: "Monthly", cadenceInterval: 6, chargeDay: "3" },
        t,
      ),
    ).toBe("monthly.many:6:3");
  });
});
