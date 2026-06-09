import { describe, expect, it } from "vitest";

import { parseAsAmountFilter } from "./transaction-filters";

describe("parseAsAmountFilter", () => {
  it("parses a non-negative decimal, normalizing a comma", () => {
    expect(parseAsAmountFilter.parse("1234.50")).toBe("1234.50");
    expect(parseAsAmountFilter.parse("1234,50")).toBe("1234.50");
  });

  it("rejects negatives, junk, and too many decimals", () => {
    expect(parseAsAmountFilter.parse("-5")).toBeNull();
    expect(parseAsAmountFilter.parse("abc")).toBeNull();
    expect(parseAsAmountFilter.parse("1.999")).toBeNull();
  });

  it("serializes back to the same string", () => {
    expect(parseAsAmountFilter.serialize("100.00")).toBe("100.00");
  });
});
