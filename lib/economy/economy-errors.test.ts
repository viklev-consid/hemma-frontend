import { describe, expect, it } from "vitest";

import type { ProblemDetails } from "@/api/problems";

import { ECONOMY_ERRORS, isEconomyError } from "./economy-errors";

function problem(overrides: Partial<ProblemDetails>): ProblemDetails {
  return { status: 409, ...overrides } as ProblemDetails;
}

describe("ECONOMY_ERRORS", () => {
  it("pins the backend's already-linked code", () => {
    expect(ECONOMY_ERRORS.TransactionAlreadyLinked).toBe(
      "Economy.Transaction.AlreadyLinked",
    );
  });
});

describe("isEconomyError", () => {
  it("matches the code in the problem type", () => {
    expect(
      isEconomyError(
        problem({ type: "https://errors/Economy.Transaction.AlreadyLinked" }),
        ECONOMY_ERRORS.TransactionAlreadyLinked,
      ),
    ).toBe(true);
  });

  it("matches the code in the problem title", () => {
    expect(
      isEconomyError(
        problem({ title: "Economy.Transaction.AlreadyLinked" }),
        ECONOMY_ERRORS.TransactionAlreadyLinked,
      ),
    ).toBe(true);
  });

  it("returns false when no code is present (degrade to generic handling)", () => {
    expect(
      isEconomyError(
        problem({ title: "Conflict", detail: "Already linked elsewhere." }),
        ECONOMY_ERRORS.TransactionAlreadyLinked,
      ),
    ).toBe(false);
  });
});
