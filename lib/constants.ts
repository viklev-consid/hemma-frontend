export const BACKEND_URL =
  process.env.BACKEND_URL?.replace(/\/$/, "") ?? "https://localhost:7297";

export const SESSION_COOKIE_NAME = "hemma-session";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
