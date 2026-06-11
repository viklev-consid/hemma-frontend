import { describe, expect, it } from "vitest";

import {
  ATTACHMENT_MAX_BYTES,
  isAllowedAttachmentType,
  isWithinAttachmentSize,
  validateAttachmentFile,
} from "./attachment";

function fakeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], "attachment", { type });
}

describe("isAllowedAttachmentType", () => {
  it("accepts PDF, JPEG, PNG, and WebP", () => {
    expect(isAllowedAttachmentType(fakeFile("application/pdf", 10))).toBe(true);
    expect(isAllowedAttachmentType(fakeFile("image/jpeg", 10))).toBe(true);
    expect(isAllowedAttachmentType(fakeFile("image/png", 10))).toBe(true);
    expect(isAllowedAttachmentType(fakeFile("image/webp", 10))).toBe(true);
  });

  it("rejects other types", () => {
    expect(isAllowedAttachmentType(fakeFile("image/gif", 10))).toBe(false);
    expect(isAllowedAttachmentType(fakeFile("text/plain", 10))).toBe(false);
  });
});

describe("isWithinAttachmentSize", () => {
  it("accepts non-empty files up to the cap", () => {
    expect(isWithinAttachmentSize(fakeFile("image/png", 1))).toBe(true);
    expect(
      isWithinAttachmentSize(fakeFile("image/png", ATTACHMENT_MAX_BYTES)),
    ).toBe(true);
  });

  it("rejects empty and oversized files", () => {
    expect(isWithinAttachmentSize(fakeFile("image/png", 0))).toBe(false);
    expect(
      isWithinAttachmentSize(fakeFile("image/png", ATTACHMENT_MAX_BYTES + 1)),
    ).toBe(false);
  });
});

describe("validateAttachmentFile", () => {
  it("returns null for a valid file", () => {
    expect(
      validateAttachmentFile(fakeFile("application/pdf", 1024)),
    ).toBeNull();
  });

  it("flags empty before type", () => {
    expect(validateAttachmentFile(fakeFile("image/gif", 0))).toBe("empty");
  });

  it("flags a disallowed type", () => {
    expect(validateAttachmentFile(fakeFile("image/gif", 1024))).toBe("type");
  });

  it("flags an oversized file", () => {
    expect(
      validateAttachmentFile(fakeFile("image/png", ATTACHMENT_MAX_BYTES + 1)),
    ).toBe("size");
  });
});
