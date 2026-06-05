export const DEFAULT_NEXT_PATH = "/app";

export function safeNextPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_NEXT_PATH,
): string {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/api/") || value.startsWith("/auth/")) return fallback;
  return value;
}
