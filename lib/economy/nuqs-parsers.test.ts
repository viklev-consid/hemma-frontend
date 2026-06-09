import { describe, expect, it } from "vitest";

import { parseAsAnchorDate } from "./nuqs-parsers";

describe("parseAsAnchorDate", () => {
  it("parses a valid YYYY-MM-DD string", () => {
    expect(parseAsAnchorDate.parse("2026-06-09")).toBe("2026-06-09");
  });

  it("rejects malformed values", () => {
    expect(parseAsAnchorDate.parse("2026/06/09")).toBeNull();
    expect(parseAsAnchorDate.parse("June 9")).toBeNull();
    expect(parseAsAnchorDate.parse("")).toBeNull();
  });

  it("serializes back to the same string", () => {
    expect(parseAsAnchorDate.serialize("2026-06-09")).toBe("2026-06-09");
  });
});
