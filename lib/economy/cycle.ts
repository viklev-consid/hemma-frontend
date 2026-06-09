/**
 * Cycle-start-day bounds. The backend enforces 1–28 at both request-validation
 * and domain level (out of range → HTTP 422 with `errors.CycleStartDay`). The
 * UI mirrors the bound so users can't pick a value that's guaranteed to fail;
 * the backend remains authoritative.
 */
export const CYCLE_START_DAY_MIN = 1;
export const CYCLE_START_DAY_MAX = 28;

/** True when `value` is a whole number within the 1–28 cycle-start-day range. */
export function isValidCycleStartDay(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= CYCLE_START_DAY_MIN &&
    value <= CYCLE_START_DAY_MAX
  );
}

/** The selectable cycle-start days, 1…28, for rendering a picker. */
export function cycleStartDayOptions(): number[] {
  return Array.from(
    { length: CYCLE_START_DAY_MAX - CYCLE_START_DAY_MIN + 1 },
    (_, index) => CYCLE_START_DAY_MIN + index,
  );
}
