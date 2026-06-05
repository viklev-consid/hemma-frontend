import "server-only";

import { createClient, createConfig } from "@/api/generated/client";
import type { ClientOptions } from "@/api/generated/client/types.gen";
import { backendFetch, backendUrl } from "@/lib/backend";
import { getUsableServerSession } from "@/lib/server-auth";

function proxyPathFromUrl(input: RequestInfo | URL) {
  const value = input instanceof Request ? input.url : input.toString();
  const url = new URL(value, "http://localhost");

  if (
    url.pathname !== "/api/proxy" &&
    !url.pathname.startsWith("/api/proxy/")
  ) {
    return null;
  }

  return `${url.pathname.slice("/api/proxy".length)}${url.search}`;
}

async function serverProxyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const proxyPath = proxyPathFromUrl(input);

  if (!proxyPath) {
    return fetch(input, init);
  }

  const session = await getUsableServerSession();

  if (!session) {
    return Response.json(
      { title: "Unauthorized", status: 401 },
      { status: 401 },
    );
  }

  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${session.accessToken}`);
  headers.delete("host");
  headers.delete("cookie");

  return backendFetch(backendUrl(proxyPath), {
    ...init,
    headers,
    cache: "no-store",
  });
}

export const serverClient = createClient(
  createConfig<ClientOptions>({
    baseUrl: "/api/proxy",
    fetch: serverProxyFetch,
  }),
);
