import { backendFetch, backendUrl, refreshSession } from "@/lib/backend";
import {
  getSession,
  hasRefreshableSession,
  hasUsableSession,
  shouldRefreshSession,
} from "@/lib/session";

export const dynamic = "force-dynamic";

type ProxyContext = {
  params: Promise<{
    path: string[];
  }>;
};

const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
]);

const forwardedRequestHeaders = new Set([
  "accept",
  "accept-language",
  "content-type",
  "if-match",
  "if-none-match",
  "last-event-id",
  "user-agent",
]);

function proxyRequestHeaders(request: Request, accessToken: string) {
  const headers = new Headers();

  for (const [key, value] of request.headers) {
    if (forwardedRequestHeaders.has(key)) {
      headers.set(key, value);
    }
  }

  headers.set("authorization", `Bearer ${accessToken}`);
  return headers;
}

function unauthorized() {
  return Response.json({ title: "Unauthorized", status: 401 }, { status: 401 });
}

async function proxyRequest(request: Request, context: ProxyContext) {
  const session = await getSession();

  if (!hasRefreshableSession(session)) return unauthorized();

  if (!hasUsableSession(session) || shouldRefreshSession(session)) {
    const nextSession = await refreshSession(session);

    if (!nextSession) {
      // Do not mutate session state from generic GET requests. The explicit
      // refresh endpoint can destroy a rejected session cookie.
      if (request.method !== "GET") {
        session.destroy();
      }
      return unauthorized();
    }

    Object.assign(session, nextSession);
    await session.save();
  }

  const accessToken = session.accessToken;
  if (!accessToken) return unauthorized();

  const { path } = await context.params;
  const incomingUrl = new URL(request.url);
  const target = new URL(backendUrl(path.join("/")));
  target.search = incomingUrl.search;

  const headers = proxyRequestHeaders(request, accessToken);

  const hasBody =
    !["GET", "HEAD"].includes(request.method) && request.body !== null;

  const response = await backendFetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? "half" : undefined,
    cache: "no-store",
  } as RequestInit & { duplex?: "half" });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("set-cookie");
  for (const header of hopByHopHeaders) {
    responseHeaders.delete(header);
  }

  const contentType = responseHeaders.get("content-type");
  if (contentType?.includes("text/event-stream")) {
    responseHeaders.set("cache-control", "no-cache");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
