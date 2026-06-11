import type { Currency, MoneyDto } from "@/api/generated";

/**
 * Economy is SEK-only (see `docs/workflows/phase-1-economy-core.md`). The
 * currency is never picked by the user — these constants are the single
 * source for "what currency" and "how to render it" across economy UI.
 */
export const ECONOMY_CURRENCY: Currency = "SEK";

/** Fixed display locale for money + period labels. Fixing the locale (rather
 * than reading the runtime locale) keeps server and client output identical,
 * so currency strings don't trigger a hydration mismatch. */
export const ECONOMY_LOCALE = "sv-SE";

// Non-negative decimal string with up to two fraction digits, e.g. "0", "12",
// "12.5", "12.50". The backend models money as a decimal string; the browser
// never does arithmetic on it (see "No money math in the browser").
const MONEY_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
type MoneyAmountInput = number | string;

/**
 * Format a `MoneyDto` for display. Parses the decimal string to a number
 * for `Intl.NumberFormat` only — this is presentation, not arithmetic, and the
 * raw string is never mutated. Falls back to the raw amount if it isn't a
 * finite number so a malformed value is visible rather than rendered as "NaN".
 */
export function formatMoney(
  money: Pick<MoneyDto, "amount" | "currency">,
  locale: string = ECONOMY_LOCALE,
): string {
  const numeric = Number(money.amount);
  if (!Number.isFinite(numeric)) {
    return String(money.amount);
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
  }).format(numeric);
}

/**
 * Normalize raw money input to the decimal-string shape the backend expects:
 * trim whitespace and accept a Swedish comma as the decimal separator.
 */
export function normalizeMoneyAmount(value: MoneyAmountInput): string {
  return String(value).trim().replace(/\s/g, "").replace(",", ".");
}

/** True when `value` is a non-negative decimal string with ≤2 fraction digits. */
export function isValidMoneyAmount(value: MoneyAmountInput): boolean {
  return MONEY_AMOUNT_PATTERN.test(normalizeMoneyAmount(value));
}

/**
 * Build a `MoneyDto` from raw input. Always stamps `currency: "SEK"` — the
 * UI never submits a currency literal or a picked value.
 */
export function toMoneyRequest(amount: MoneyAmountInput): MoneyDto {
  return { amount: normalizeMoneyAmount(amount), currency: ECONOMY_CURRENCY };
}
