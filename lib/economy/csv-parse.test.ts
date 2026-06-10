import { describe, expect, it } from "vitest";

import { CsvParseError, parseCsv } from "./csv-parse";

function blob(content: string): File {
  return new File([content], "import.csv", { type: "text/csv" });
}

describe("parseCsv", () => {
  it("splits the header row from body rows", async () => {
    const result = await parseCsv(
      blob("Date,Amount\n2026-06-01,123\n2026-06-02,456"),
    );
    expect(result.headers).toEqual(["Date", "Amount"]);
    expect(result.rows).toEqual([
      ["2026-06-01", "123"],
      ["2026-06-02", "456"],
    ]);
  });

  it("auto-detects the semicolon delimiter", async () => {
    const result = await parseCsv(blob("Date;Amount\n2026-06-01;123"));
    expect(result.headers).toEqual(["Date", "Amount"]);
    expect(result.rows).toEqual([["2026-06-01", "123"]]);
  });

  it("handles quoted cells with embedded commas", async () => {
    const result = await parseCsv(blob('Desc,Amount\n"ICA, Stockholm",123'));
    expect(result.rows[0]).toEqual(["ICA, Stockholm", "123"]);
  });

  it("drops fully-empty trailing rows", async () => {
    const result = await parseCsv(blob("A,B\n1,2\n\n\n"));
    expect(result.rows).toEqual([["1", "2"]]);
  });

  it("rejects an empty file with the 'empty' code", async () => {
    await expect(parseCsv(blob("   \n  "))).rejects.toMatchObject({
      name: "CsvParseError",
      code: "empty",
    });
    await expect(parseCsv(blob("   \n  "))).rejects.toBeInstanceOf(
      CsvParseError,
    );
  });
});
