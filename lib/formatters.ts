import { getFormatter } from "next-intl/server";
import { useFormatter } from "next-intl";

type DateFormatOptions = Parameters<
  ReturnType<typeof useFormatter>["dateTime"]
>[1];

type RelativeFormatOptions = Parameters<
  ReturnType<typeof useFormatter>["relativeTime"]
>[1];

type NumberFormatOptions = Parameters<
  ReturnType<typeof useFormatter>["number"]
>[1];

export function useDateTime() {
  const format = useFormatter();
  return (value: Date | number, options?: DateFormatOptions) =>
    format.dateTime(value, options);
}

export function useRelativeTime() {
  const format = useFormatter();
  return (value: Date | number, options?: RelativeFormatOptions) =>
    format.relativeTime(value, options);
}

export function useNumber() {
  const format = useFormatter();
  return (value: number, options?: NumberFormatOptions) =>
    format.number(value, options);
}

export async function formatDateTime(
  value: Date | number,
  options?: DateFormatOptions,
) {
  const format = await getFormatter();
  return format.dateTime(value, options);
}

export async function formatRelativeTime(
  value: Date | number,
  options?: RelativeFormatOptions,
) {
  const format = await getFormatter();
  return format.relativeTime(value, options);
}

export async function formatNumber(
  value: number,
  options?: NumberFormatOptions,
) {
  const format = await getFormatter();
  return format.number(value, options);
}
