// Backend percentage fields have existed as both ratios (0.8) and whole
// percents (80). Format defensively for display only.
export function formatBudgetPercent(value: number | string) {
  const numeric = Number(value);
  const percent = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;

  return Math.round(percent);
}
