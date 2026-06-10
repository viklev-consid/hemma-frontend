import { describe, expect, it } from "vitest";

import { applyMapping, guessMapping } from "./import-mapping";

describe("applyMapping", () => {
  const rows = [
    ["2026-06-01", "ICA", "-123,50", "Groceries", "OCR1", "1 000,00"],
    ["2026-06-02", "Lön", "25000", "Salary", "", ""],
  ];
  // columns: 0 date, 1 counterparty, 2 amount, 3 description, 4 reference, 5 balance
  const mapping = {
    occurredOn: 0,
    counterparty: 1,
    amount: 2,
    description: 3,
    reference: 4,
    balanceAfter: 5,
  };

  it("stamps rowNumber (1-based), SEK currency, and null categoryId", () => {
    const [first] = applyMapping(rows, mapping);
    expect(first.rowNumber).toBe(1);
    expect(first.currency).toBe("SEK");
    expect(first.categoryId).toBeNull();
  });

  it("normalizes Swedish-formatted amounts to decimal strings", () => {
    const [first] = applyMapping(rows, mapping);
    expect(first.amount).toBe("-123.50");
  });

  it("wraps balanceAfter as a MoneyRequest", () => {
    const [first] = applyMapping(rows, mapping);
    expect(first.balanceAfter).toEqual({ amount: "1000.00", currency: "SEK" });
  });

  it("maps blank cells and unmapped fields to null", () => {
    const [, second] = applyMapping(rows, mapping);
    expect(second.reference).toBeNull();
    expect(second.balanceAfter).toBeNull();
    expect(second.rawDescription).toBeNull();
  });

  it("passes occurredOn through verbatim (no date math)", () => {
    const [first] = applyMapping(rows, mapping);
    expect(first.occurredOn).toBe("2026-06-01");
  });
});

describe("guessMapping", () => {
  it("matches common Swedish bank headers", () => {
    const m = guessMapping(["Bokföringsdatum", "Belopp", "Saldo", "Motpart"]);
    expect(m.occurredOn).toBe(0);
    expect(m.amount).toBe(1);
    expect(m.balanceAfter).toBe(2);
    expect(m.counterparty).toBe(3);
  });

  it("leaves unrecognized columns unmapped", () => {
    const m = guessMapping(["Mystery", "Belopp"]);
    expect(m.amount).toBe(1);
    expect(Object.values(m)).not.toContain(0);
  });

  it("maps 'Bokfört saldo' as balance even when it precedes the date column", () => {
    const m = guessMapping(["Bokfört saldo", "Bokföringsdatum", "Belopp"]);
    expect(m.balanceAfter).toBe(0);
    expect(m.occurredOn).toBe(1);
    expect(m.amount).toBe(2);
  });
});
