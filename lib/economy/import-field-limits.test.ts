import { describe, expect, it } from "vitest";

import {
  hasFieldLengthViolations,
  IMPORT_FIELD_LIMITS,
  validateImportRow,
} from "./import-field-limits";

const ok = {
  description: "Groceries",
  counterparty: "ICA",
  reference: "OCR123",
  rawDescription: "ICA SUPERMARKET STOCKHOLM",
};

describe("validateImportRow", () => {
  it("passes a row within all limits", () => {
    expect(validateImportRow(ok)).toEqual({});
  });

  it("passes null values", () => {
    expect(
      validateImportRow({
        description: null,
        counterparty: null,
        reference: null,
        rawDescription: null,
      }),
    ).toEqual({});
  });

  it("flags description over its limit", () => {
    const row = {
      ...ok,
      description: "x".repeat(IMPORT_FIELD_LIMITS.description + 1),
    };
    expect(validateImportRow(row)).toEqual({ description: "tooLong" });
  });

  it("flags multiple offending fields", () => {
    const row = {
      description: "x".repeat(IMPORT_FIELD_LIMITS.description + 1),
      counterparty: "y".repeat(IMPORT_FIELD_LIMITS.counterparty + 1),
      reference: "OCR",
      rawDescription: "z".repeat(IMPORT_FIELD_LIMITS.rawDescription + 1),
    };
    expect(validateImportRow(row)).toEqual({
      description: "tooLong",
      counterparty: "tooLong",
      rawDescription: "tooLong",
    });
  });

  it("accepts a value exactly at the limit", () => {
    const row = { ...ok, reference: "r".repeat(IMPORT_FIELD_LIMITS.reference) };
    expect(validateImportRow(row)).toEqual({});
  });
});

describe("hasFieldLengthViolations", () => {
  it("is true when any row violates a limit", () => {
    const bad = {
      ...ok,
      reference: "r".repeat(IMPORT_FIELD_LIMITS.reference + 1),
    };
    expect(hasFieldLengthViolations([ok, bad])).toBe(true);
  });

  it("is false when all rows pass", () => {
    expect(hasFieldLengthViolations([ok, ok])).toBe(false);
  });
});
