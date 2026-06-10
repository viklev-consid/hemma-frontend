import type {
  SubscriptionLifecycleState,
  SubscriptionMatchState,
  SubscriptionResponse,
} from "@/api/generated";
import {
  cadenceDayOptions,
  formatCadence,
  type CadenceMessageKey,
} from "@/lib/economy/cadence";

/**
 * Subscription enum catalogs. Lifecycle states are PascalCase, but match
 * states are **lowercase** in the backend contract — don't "fix" the casing;
 * `as const satisfies Record<...>` turns a backend rename into a TypeScript
 * error at every call site. Mirrors `RECURRING_BILL_TYPE` in
 * `lib/economy/recurring-bill.ts`.
 */
export const SUBSCRIPTION_LIFECYCLE_STATE = {
  Trial: "Trial",
  Active: "Active",
  Paused: "Paused",
  Cancelled: "Cancelled",
} as const satisfies Record<
  SubscriptionLifecycleState,
  SubscriptionLifecycleState
>;

export const SUBSCRIPTION_MATCH_STATE = {
  actual: "actual",
  predicted: "predicted",
  suggested: "suggested",
} as const satisfies Record<SubscriptionMatchState, SubscriptionMatchState>;

/**
 * `Cancelled` is terminal: every change-state call on a cancelled subscription
 * fails backend-side, so the UI hides state controls entirely for them. There
 * is no DELETE — cancelled subscriptions persist by design (linked actuals and
 * old calendar months still reference them).
 */
export function isTerminal(state: SubscriptionLifecycleState): boolean {
  return state === SUBSCRIPTION_LIFECYCLE_STATE.Cancelled;
}

/**
 * Subscription cadence-interval bounds. ⚠️ These are **1–24**, wider than the
 * recurring bills' 1–12 — do not reuse `cadenceIntervalOptions()` from
 * `lib/economy/cadence.ts` here. The backend 422s out-of-range values; the
 * picker mirrors the bound so users can't pick a guaranteed failure.
 */
export const SUBSCRIPTION_INTERVAL_MIN = 1;
export const SUBSCRIPTION_INTERVAL_MAX = 24;

/** True when `value` is a whole number within the 1–24 subscription range. */
export function isValidSubscriptionInterval(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= SUBSCRIPTION_INTERVAL_MIN &&
    value <= SUBSCRIPTION_INTERVAL_MAX
  );
}

/** Selectable subscription cadence intervals, 1…24, for rendering a picker. */
export function subscriptionIntervalOptions(): number[] {
  return Array.from(
    { length: SUBSCRIPTION_INTERVAL_MAX - SUBSCRIPTION_INTERVAL_MIN + 1 },
    (_, index) => SUBSCRIPTION_INTERVAL_MIN + index,
  );
}

/**
 * Selectable charge-day values, 1…28 — the same bound as bills (the day must
 * exist in every month), so this one *is* shared with `cadenceDayOptions`.
 */
export function subscriptionChargeDayOptions(): number[] {
  return cadenceDayOptions();
}

/**
 * Cadence label for a subscription card — delegates to the bills'
 * `formatCadence` (same message keys) after mapping `chargeDay` (which the
 * contract types as `number | string`) onto the bills' field name.
 */
export function formatSubscriptionCadence(
  subscription: Pick<
    SubscriptionResponse,
    "cadenceFrequency" | "cadenceInterval" | "chargeDay"
  >,
  t: (
    key: CadenceMessageKey,
    values?: Record<string, string | number>,
  ) => string,
): string {
  return formatCadence(
    {
      cadenceFrequency: subscription.cadenceFrequency,
      cadenceInterval: subscription.cadenceInterval,
      cadenceDayOfMonth: Number(subscription.chargeDay),
    },
    t,
  );
}
