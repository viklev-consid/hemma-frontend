import { describe, expect, it } from "vitest";

import {
  ECONOMY_CURRENCY,
  formatMoney,
  isValidMoneyAmount,
  normalizeMoneyAmount,
  toMoneyRequest,
} from "./money";

describe("formatMoney", () => {
  it("formats a SEK amount in the Swedish locale", () => {
    // sv-SE currency formatting uses a non-breaking space group separator and
    // the "kr" suffix. Assert on the parts that matter rather than exact
    // whitespace bytes.
    const formatted = formatMoney({ amount: "1234.50", currency: "SEK" });
    expect(formatted).toContain("kr");
    expect(formatted.replace(/\s/g, "")).toContain("1234,50");
  });

  it("renders whole amounts with two fraction digits", () => {
    expect(formatMoney({ amount: "100", currency: "SEK" })).toContain("100,00");
  });

  it("falls back to the raw amount when it isn't a finite number", () => {
    expect(formatMoney({ amount: "not-a-number", currency: "SEK" })).toBe(
      "not-a-number",
    );
  });
});

describe("normalizeMoneyAmount", () => {
  it("trims, strips inner whitespace, and converts a comma decimal", () => {
    expect(normalizeMoneyAmount(" 1 234,50 ")).toBe("1234.50");
  });
});

describe("isValidMoneyAmount", () => {
  it("accepts non-negative decimals with up to two fraction digits", () => {
    expect(isValidMoneyAmount("0")).toBe(true);
    expect(isValidMoneyAmount("12")).toBe(true);
    expect(isValidMoneyAmount("12.5")).toBe(true);
    expect(isValidMoneyAmount("12.50")).toBe(true);
    expect(isValidMoneyAmount("12,50")).toBe(true);
  });

  it("rejects negatives, too many fraction digits, and non-numerics", () => {
    expect(isValidMoneyAmount("-5")).toBe(false);
    expect(isValidMoneyAmount("12.555")).toBe(false);
    expect(isValidMoneyAmount("")).toBe(false);
    expect(isValidMoneyAmount("abc")).toBe(false);
  });
});

describe("toMoneyRequest", () => {
  it("normalizes the amount and always stamps SEK", () => {
    expect(toMoneyRequest("1 000,25")).toEqual({
      amount: "1000.25",
      currency: ECONOMY_CURRENCY,
    });
  });
});
