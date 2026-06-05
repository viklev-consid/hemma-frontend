import type { LoginTwoFactorResponse } from "@/api/generated";
import {
  fetchBackend,
  getHasCompletedOnboarding,
  problemResponse,
  publicUser,
  readJsonBody,
  sessionFromTokenResponse,
} from "@/lib/backend";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body instanceof Response) return body;
  const response = await fetchBackend("/v1/users/login/2fa", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    return problemResponse(response);
  }

  const tokens = (await response.json()) as LoginTwoFactorResponse;
  const nextSession = sessionFromTokenResponse(tokens);
  const session = await getSession();
  Object.assign(session, nextSession, {
    hasCompletedOnboarding: await getHasCompletedOnboarding(
      nextSession.accessToken,
    ),
  });
  await session.save();

  return Response.json({
    status: "Authenticated",
    user: publicUser(nextSession.user),
  });
}
