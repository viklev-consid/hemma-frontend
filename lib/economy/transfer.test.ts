import { describe, expect, it } from "vitest";

import { defaultTransferMode, TRANSFER_MODE } from "./transfer";

describe("defaultTransferMode", () => {
  it("defaults to Savings when the destination is a savings account", () => {
    expect(defaultTransferMode("Savings")).toBe(TRANSFER_MODE.Savings);
  });

  it("defaults to Neutral for spending destinations", () => {
    expect(defaultTransferMode("Spending")).toBe(TRANSFER_MODE.Neutral);
  });

  it("defaults to Neutral when the destination type is unknown", () => {
    expect(defaultTransferMode(undefined)).toBe(TRANSFER_MODE.Neutral);
  });
});
