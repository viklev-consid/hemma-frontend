import type { LoginResponse } from "@/api/generated";
import {
  fetchBackend,
  getHasCompletedOnboarding,
  publicAuthProblemResponse,
  publicUser,
  readJsonBody,
  sessionFromTokenResponse,
} from "@/lib/backend";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body instanceof Response) return body;
  const response = await fetchBackend("/v1/users/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    return publicAuthProblemResponse(response);
  }

  const payload = (await response.json()) as LoginResponse;

  if (payload.status === "twoFactorRequired" && payload.challenge) {
    return Response.json({
      status: "TwoFactorRequired",
      challengeToken: payload.challenge.challengeToken,
      expiresAt: payload.challenge.expiresAt,
    });
  }

  if (payload.status !== "authenticated" || !payload.session) {
    return Response.json(
      {
        title: "Unexpected login response",
        status: 502,
      },
      { status: 502, headers: { "content-type": "application/problem+json" } },
    );
  }

  const nextSession = sessionFromTokenResponse(payload.session);
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
