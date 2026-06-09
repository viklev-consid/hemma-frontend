import { describe, expect, it } from "vitest";

import {
  RECEIPT_MAX_BYTES,
  isAllowedReceiptType,
  isWithinReceiptSize,
  validateReceiptFile,
} from "./receipt";

function fakeFile(type: string, size: number): File {
  // jsdom File: build with a blob part sized to `size`, then override type.
  const file = new File([new Uint8Array(size)], "receipt", { type });
  return file;
}

describe("isAllowedReceiptType", () => {
  it("accepts PDF, PNG, and JPEG", () => {
    expect(isAllowedReceiptType(fakeFile("application/pdf", 10))).toBe(true);
    expect(isAllowedReceiptType(fakeFile("image/png", 10))).toBe(true);
    expect(isAllowedReceiptType(fakeFile("image/jpeg", 10))).toBe(true);
  });

  it("rejects other types", () => {
    expect(isAllowedReceiptType(fakeFile("image/gif", 10))).toBe(false);
    expect(isAllowedReceiptType(fakeFile("text/plain", 10))).toBe(false);
  });
});

describe("isWithinReceiptSize", () => {
  it("accepts non-empty files up to the cap", () => {
    expect(isWithinReceiptSize(fakeFile("image/png", 1))).toBe(true);
    expect(isWithinReceiptSize(fakeFile("image/png", RECEIPT_MAX_BYTES))).toBe(
      true,
    );
  });

  it("rejects empty and oversized files", () => {
    expect(isWithinReceiptSize(fakeFile("image/png", 0))).toBe(false);
    expect(
      isWithinReceiptSize(fakeFile("image/png", RECEIPT_MAX_BYTES + 1)),
    ).toBe(false);
  });
});

describe("validateReceiptFile", () => {
  it("returns null for a valid file", () => {
    expect(validateReceiptFile(fakeFile("application/pdf", 1000))).toBeNull();
  });

  it("flags empty, then type, then size", () => {
    expect(validateReceiptFile(fakeFile("application/pdf", 0))).toBe("empty");
    expect(validateReceiptFile(fakeFile("image/gif", 1000))).toBe("type");
    expect(
      validateReceiptFile(fakeFile("image/png", RECEIPT_MAX_BYTES + 1)),
    ).toBe("size");
  });
});
