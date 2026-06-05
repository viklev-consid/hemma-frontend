import { describe, expect, it } from "vitest";

import { parseIsoDate, titleCaseLegalType } from "@/lib/legal";

describe("titleCaseLegalType", () => {
  it("title-cases hyphen-separated slugs", () => {
    expect(titleCaseLegalType("acceptable-use-policy")).toBe(
      "Acceptable Use Policy",
    );
  });

  it("title-cases underscore-separated slugs", () => {
    expect(titleCaseLegalType("eu_data_addendum")).toBe("Eu Data Addendum");
  });

  it("title-cases space-separated slugs", () => {
    expect(titleCaseLegalType("custom policy")).toBe("Custom Policy");
  });

  it("collapses repeated separators and trims empties", () => {
    expect(titleCaseLegalType("foo--bar__baz")).toBe("Foo Bar Baz");
  });

  it("returns empty string for empty input", () => {
    expect(titleCaseLegalType("")).toBe("");
  });
});

describe("parseIsoDate", () => {
  it("parses a valid ISO 8601 timestamp", () => {
    const date = parseIsoDate("2026-01-20T10:00:00Z");
    expect(date.getTime()).toBe(Date.UTC(2026, 0, 20, 10, 0, 0));
  });
});
