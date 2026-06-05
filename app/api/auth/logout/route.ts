import { fetchBackend } from "@/lib/backend";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();

  if (session.accessToken && session.refreshToken) {
    await fetchBackend("/v1/users/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        "content-type": "application/json",
      },
    }).catch(() => undefined);
  }

  session.destroy();

  if (request.headers.get("accept")?.includes("text/html")) {
    return Response.redirect(new URL("/login", request.url), 303);
  }

  return Response.json({ ok: true });
}
