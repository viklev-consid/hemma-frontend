import Papa from "papaparse";

/**
 * The CSV parsing seam. The whole app talks to PapaParse **only** through this
 * module so the import wizard stays parser-agnostic and the normalization is
 * unit-testable (the parse engine itself is PapaParse's responsibility).
 *
 * Browser-only by design: callers hand a `File`/`Blob` straight from a file
 * input. PapaParse strips the BOM, auto-detects the `,`/`;` delimiter, and
 * handles quoted/embedded newlines — what real Swedish bank exports need.
 */

export type ParsedCsv = {
  /** The first row, treated as the header. Empty array when the file is empty. */
  headers: string[];
  /** Body rows, each a string cell array aligned to `headers` by position. */
  rows: string[][];
};

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}

/**
 * Parse a CSV `File`/`Blob` into headers + body rows. Rejects with a
 * `CsvParseError` when PapaParse reports a fatal error or the file has no
 * usable header row. Trailing fully-empty rows (the common bank-export
 * artifact) are dropped; cells are trimmed.
 */
export function parseCsv(file: File): Promise<ParsedCsv> {
  return new Promise<ParsedCsv>((resolve, reject) => {
    Papa.parse<string[]>(file, {
      // Header detection is the wizard's job (the mapping step), so parse
      // positionally and never let PapaParse coerce types — every cell stays a
      // raw string for the normalizer downstream.
      header: false,
      skipEmptyLines: "greedy",
      // BOM strip + `,`/`;` auto-detection are PapaParse defaults for browsers.
      complete(results) {
        const fatal = results.errors.find((e) => e.type === "Quotes");
        if (fatal) {
          reject(new CsvParseError(fatal.message));
          return;
        }

        const matrix = (results.data as unknown[][])
          .map((row) => row.map((cell) => String(cell ?? "").trim()))
          // Drop rows that are entirely empty after trimming.
          .filter((row) => row.some((cell) => cell.length > 0));

        if (matrix.length === 0) {
          reject(new CsvParseError("empty"));
          return;
        }

        const [headers, ...rows] = matrix;
        resolve({ headers, rows });
      },
      error(error) {
        reject(new CsvParseError(error.message));
      },
    });
  });
}
