import "server-only";

import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { BACKEND_URL } from "@/lib/constants";
import type { SessionData, SessionUser } from "@/lib/session";

export type TokenResponse = {
  userId?: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt?: string;
};

type JwtClaims = {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"?: string;
  [claim: string]: unknown;
};

export function backendUrl(path: string) {
  return `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function allowsInsecureLocalHttps(url: URL) {
  return (
    process.env.NODE_ENV !== "production" &&
    url.protocol === "https:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  );
}

function headersToObject(headersInit?: HeadersInit) {
  const headers = new Headers(headersInit);
  const result: Record<string, string> = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

function writeRequestBody(
  request: ReturnType<typeof httpsRequest>,
  body: BodyInit | null | undefined,
) {
  if (!body) {
    request.end();
    return;
  }

  if (body instanceof ReadableStream) {
    Readable.fromWeb(body as NodeReadableStream).pipe(request);
    return;
  }

  request.end(body);
}

export async function backendFetch(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(input);

  if (!allowsInsecureLocalHttps(url)) {
    return fetch(url, init);
  }

  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: init?.method,
        headers: headersToObject(init?.headers),
        rejectUnauthorized: false,
      },
      (backendResponse) => {
        const headers = new Headers();

        for (const [key, value] of Object.entries(backendResponse.headers)) {
          if (Array.isArray(value)) {
            for (const item of value) {
              headers.append(key, item);
            }
          } else if (value !== undefined) {
            headers.set(key, value);
          }
        }

        const status = backendResponse.statusCode ?? 200;
        const isNullBodyStatus =
          status === 101 ||
          status === 103 ||
          status === 204 ||
          status === 205 ||
          status === 304;

        if (isNullBodyStatus) {
          backendResponse.resume();
        }

        resolve(
          new Response(
            isNullBodyStatus
              ? null
              : (Readable.toWeb(backendResponse) as ReadableStream),
            {
              status,
              statusText: backendResponse.statusMessage,
              headers,
            },
          ),
        );
      },
    );

    request.on("error", reject);
    writeRequestBody(request, init?.body);
  });
}

export async function readJsonBody<T>(request: Request): Promise<T | Response> {
  const text = await request.text();
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    return Response.json(
      { title: "Invalid JSON", status: 400 },
      { status: 400, headers: { "content-type": "application/problem+json" } },
    );
  }
}

export async function problemResponse(response: Response) {
  const contentType =
    response.headers.get("content-type") ?? "application/json";
  const body = await response.text();

  return new Response(
    body ||
      JSON.stringify({ title: response.statusText, status: response.status }),
    {
      status: response.status,
      headers: {
        "content-type": contentType.includes("json")
          ? contentType
          : "application/problem+json",
      },
    },
  );
}

export function publicAuthProblemResponse(response: Response) {
  return Response.json(
    { title: "Unable to complete request", status: response.status },
    {
      status: response.status,
      headers: { "content-type": "application/problem+json" },
    },
  );
}

export async function fetchBackend(path: string, init?: RequestInit) {
  return backendFetch(backendUrl(path), {
    ...init,
    headers: {
      accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export function decodeJwt(token: string): JwtClaims {
  const [, payload] = token.split(".");

  if (!payload) {
    return {};
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = Buffer.from(normalized, "base64").toString("utf8");

  return JSON.parse(decoded) as JwtClaims;
}

export function sessionFromTokenResponse(tokens: TokenResponse): SessionData & {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SessionUser;
} {
  const claims = decodeJwt(tokens.accessToken);
  const expiresAt =
    claims.exp ??
    Math.floor(new Date(tokens.accessTokenExpiresAt).getTime() / 1000);
  const user: SessionUser = {
    id: tokens.userId ?? claims.sub ?? "",
    email:
      claims.email ??
      claims[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      ] ??
      "",
    role:
      claims.role ??
      claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
      "User",
  };

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt,
    user,
  };
}

export function publicUser(user: SessionUser) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

export async function refreshSession(session: SessionData) {
  if (!session.refreshToken) {
    return null;
  }

  const response = await fetchBackend("/v1/users/token/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: session.refreshToken }),
    headers: {
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return sessionFromTokenResponse((await response.json()) as TokenResponse);
}

export async function getHasCompletedOnboarding(accessToken: string) {
  const response = await fetchBackend("/v1/users/me", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return false;
  }

  const profile = (await response.json()) as {
    hasCompletedOnboarding?: boolean;
  };

  return profile.hasCompletedOnboarding === true;
}
