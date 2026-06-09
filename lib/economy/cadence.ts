import type { CadenceFrequency, RecurringBillResponse } from "@/api/generated";
import { cycleStartDayOptions } from "@/lib/economy/cycle";

/**
 * Cadence interval bounds. The backend is authoritative and returns 422 for
 * out-of-range values; the UI mirrors a sensible 1–12 (every N months) so users
 * can't pick a value guaranteed to fail.
 */
export const CADENCE_INTERVAL_MIN = 1;
export const CADENCE_INTERVAL_MAX = 12;

/** True when `value` is a whole number within the 1–12 interval range. */
export function isValidCadenceInterval(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= CADENCE_INTERVAL_MIN &&
    value <= CADENCE_INTERVAL_MAX
  );
}

/** Selectable cadence intervals, 1…12, for rendering a picker. */
export function cadenceIntervalOptions(): number[] {
  return Array.from(
    { length: CADENCE_INTERVAL_MAX - CADENCE_INTERVAL_MIN + 1 },
    (_, index) => CADENCE_INTERVAL_MIN + index,
  );
}

/**
 * Selectable cadence day-of-month values, 1…28. Same 1–28 bound as the cycle
 * start day (the day must exist in every month), so we reuse that source.
 */
export function cadenceDayOptions(): number[] {
  return cycleStartDayOptions();
}

/**
 * A human label for a bill's cadence — label-only, no schedule math. The
 * backend owns `nextDueOn`; this never derives a date. Frequency is
 * monthly-only in the contract, so the interval picks the singular/plural form:
 * - interval 1 → "Every month on day 25"
 * - interval N → "Every N months on day 1"
 */
/** Message keys `formatCadence` may request, relative to the `cadence` block. */
export type CadenceMessageKey = "monthly.one" | "monthly.many" | "unknown";

export function formatCadence(
  cadence: Pick<
    RecurringBillResponse,
    "cadenceFrequency" | "cadenceInterval" | "cadenceDayOfMonth"
  >,
  t: (
    key: CadenceMessageKey,
    values?: Record<string, string | number>,
  ) => string,
): string {
  // CadenceFrequency is monthly-only today; assert it so a future enum value
  // surfaces here instead of silently rendering a wrong label.
  const frequency: CadenceFrequency = cadence.cadenceFrequency;
  if (frequency !== "Monthly") {
    return t("unknown");
  }
  return cadence.cadenceInterval === 1
    ? t("monthly.one", { day: cadence.cadenceDayOfMonth })
    : t("monthly.many", {
        interval: cadence.cadenceInterval,
        day: cadence.cadenceDayOfMonth,
      });
}
