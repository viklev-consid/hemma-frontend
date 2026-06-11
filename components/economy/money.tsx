"use client";

import type { MoneyDto } from "@/api/generated";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/economy/money";
import { cn } from "@/lib/utils";

type MoneyProps = {
  value: Pick<MoneyDto, "amount" | "currency">;
  className?: string;
};

/**
 * Display a `MoneyDto` amount, formatted as SEK. Read-only — the browser
 * never computes on the value. Use anywhere a backend money value is shown.
 */
export function Money({ value, className }: MoneyProps) {
  return (
    <span className={cn("tabular-nums", className)}>{formatMoney(value)}</span>
  );
}

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  /** The raw amount string (controlled). Parent converts via `toMoneyRequest`. */
  value: string;
  /** Called with the raw input string on every keystroke. */
  onValueChange: (value: string) => void;
};

/**
 * Money entry field. SEK is fixed — there is no currency picker anywhere in
 * the economy UI. Emits the raw decimal string; the parent form normalizes and
 * wraps it with `toMoneyRequest` (which stamps `currency: "SEK"`) on submit.
 */
export function MoneyInput({
  value,
  onValueChange,
  className,
  ...props
}: MoneyInputProps) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn("pr-9", className)}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground"
      >
        kr
      </span>
    </div>
  );
}
