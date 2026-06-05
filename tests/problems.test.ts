import { describe, expect, it } from "vitest";

import { problemHasErrorCode } from "@/api/problems";

describe("problemHasErrorCode", () => {
  it("matches the code in problem.type", () => {
    expect(
      problemHasErrorCode(
        { status: 401, type: "Users.Email.NotConfirmed" },
        "Users.Email.NotConfirmed",
      ),
    ).toBe(true);
  });

  it("matches the code embedded in a type URI", () => {
    expect(
      problemHasErrorCode(
        {
          status: 401,
          type: "https://errors.modulith.dev/Users.Email.NotConfirmed",
        },
        "Users.Email.NotConfirmed",
      ),
    ).toBe(true);
  });

  it("matches the code in problem.title", () => {
    expect(
      problemHasErrorCode(
        { status: 401, title: "Users.Email.NotConfirmed" },
        "Users.Email.NotConfirmed",
      ),
    ).toBe(true);
  });

  it("ignores matches in problem.detail to avoid localized-string false positives", () => {
    expect(
      problemHasErrorCode(
        {
          status: 401,
          title: "Invalid credentials",
          detail: "Some message mentioning Users.Email.NotConfirmed",
        },
        "Users.Email.NotConfirmed",
      ),
    ).toBe(false);
  });

  it("returns false when no fields contain the code", () => {
    expect(
      problemHasErrorCode(
        { status: 401, title: "Invalid credentials" },
        "Users.Email.NotConfirmed",
      ),
    ).toBe(false);
  });

  it("returns false when problem has no metadata", () => {
    expect(
      problemHasErrorCode({ status: 500 }, "Users.Email.NotConfirmed"),
    ).toBe(false);
  });
});
