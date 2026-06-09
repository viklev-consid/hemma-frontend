import type { NormalizedImportRowRequest } from "@/api/generated";

import { ECONOMY_CURRENCY, normalizeMoneyAmount } from "./money";

/**
 * The CSV column → field mapping model for the import wizard.
 *
 * The backend takes already-normalized rows (there is no file upload); the
 * wizard's "mapping" step maps the user's CSV header columns onto the fields of
 * a `NormalizedImportRowRequest`. These three fields are **never** user-mapped:
 * - `rowNumber` — the 1-based source data row, stamped here.
 * - `currency` — always `"SEK"` (no currency picker anywhere in economy).
 * - `categoryId` — left `null` for preview; rules auto-apply server-side.
 */
export const IMPORT_TARGET_FIELDS = [
  "occurredOn",
  "amount",
  "description",
  "counterparty",
  "reference",
  "balanceAfter",
  "rawDescription",
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number];

/**
 * A column mapping: target field → source column index (into the parsed
 * `headers`/`rows`). An absent or `null` entry means that field is unmapped and
 * will be left `null` on every row.
 */
export type ColumnMapping = Partial<Record<ImportTargetField, number | null>>;

/** Read a cell by mapped column index; returns `null` when unmapped or blank. */
function cell(row: string[], column: number | null | undefined): string | null {
  if (column === null || column === undefined) return null;
  const value = row[column];
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Apply a column mapping to the parsed CSV body rows, producing the normalized
 * rows the preview/commit endpoints expect.
 *
 * Pure and order-preserving. `amount`/`balanceAfter` are run through
 * `normalizeMoneyAmount` (trim, strip spaces, comma→dot) so Swedish-formatted
 * exports submit as the decimal-string shape the backend expects — this is
 * presentation normalization, **not** arithmetic. `occurredOn` is passed
 * through verbatim; the preview response reports per-row date/amount problems
 * in `row.errors`, so the browser does no date parsing.
 */
export function applyMapping(
  rows: string[][],
  mapping: ColumnMapping,
): NormalizedImportRowRequest[] {
  return rows.map((row, index) => {
    const amountRaw = cell(row, mapping.amount);
    const balanceRaw = cell(row, mapping.balanceAfter);
    return {
      rowNumber: index + 1,
      occurredOn: cell(row, mapping.occurredOn),
      amount: amountRaw === null ? null : normalizeMoneyAmount(amountRaw),
      description: cell(row, mapping.description),
      currency: ECONOMY_CURRENCY,
      counterparty: cell(row, mapping.counterparty),
      reference: cell(row, mapping.reference),
      balanceAfter:
        balanceRaw === null
          ? null
          : {
              amount: normalizeMoneyAmount(balanceRaw),
              currency: ECONOMY_CURRENCY,
            },
      rawDescription: cell(row, mapping.rawDescription),
      categoryId: null,
    };
  });
}

/**
 * Best-effort auto-mapping by header name. Matches common Swedish/English bank
 * export column names to target fields; unmatched columns stay unmapped. The
 * user can override every guess in the mapping step.
 */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  headers.forEach((header, index) => {
    const key = header.toLowerCase().trim();
    for (const [field, patterns] of HEADER_HINTS) {
      if (mapping[field] !== undefined) continue;
      if (patterns.some((p) => key.includes(p))) {
        mapping[field] = index;
        break;
      }
    }
  });
  return mapping;
}

/**
 * Header substrings that hint at each target field (first match wins).
 * `balanceAfter` is checked before `occurredOn` deliberately: "Bokfört saldo"
 * contains the "bokför" date hint, so the balance patterns must get first
 * claim on saldo/balance columns.
 */
const HEADER_HINTS: Array<[ImportTargetField, string[]]> = [
  ["balanceAfter", ["saldo", "balance"]],
  ["occurredOn", ["datum", "date", "bokför", "transaktionsdag"]],
  ["amount", ["belopp", "amount", "summa"]],
  [
    "counterparty",
    ["motpart", "mottagare", "counterparty", "payee", "avsändare"],
  ],
  ["reference", ["referens", "reference", "ocr", "meddelande"]],
  ["description", ["beskrivning", "description", "text", "rubrik"]],
  ["rawDescription", ["transaktion", "narrative", "specifikation"]],
];
