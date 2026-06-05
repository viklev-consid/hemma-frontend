import "server-only";

import { cookies } from "next/headers";
import {
  getIronSession,
  unsealData,
  type IronSession,
  type SessionOptions,
} from "iron-session";

import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/constants";

export type SessionUser = {
  id: string;
  email: string;
  role: string;
};

export type SessionData = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: SessionUser;
  hasCompletedOnboarding?: boolean;
};

const fallbackSecret = "development-session-secret-change-before-deploying";

function getSessionPassword() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }

  return fallbackSecret;
}

export const sessionOptions: SessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  password: getSessionPassword(),
  ttl: SESSION_TTL_SECONDS,
  cookieOptions: {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export function hasUsableSession(session: SessionData) {
  return Boolean(
    session.accessToken &&
    session.user &&
    session.expiresAt &&
    session.expiresAt * 1000 > Date.now(),
  );
}

export function hasRefreshableSession(session: SessionData) {
  return Boolean(session.refreshToken && session.user);
}

export function shouldRefreshSession(session: SessionData) {
  return Boolean(
    session.expiresAt && session.expiresAt * 1000 - Date.now() < 60_000,
  );
}

export async function unsealSessionCookie(
  value?: string,
): Promise<SessionData | null> {
  if (!value) {
    return null;
  }

  try {
    return await unsealData<SessionData>(value, {
      password: sessionOptions.password,
      ttl: SESSION_TTL_SECONDS,
    });
  } catch {
    return null;
  }
}
