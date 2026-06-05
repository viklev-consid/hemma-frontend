import {
  fetchBackend,
  getHasCompletedOnboarding,
  problemResponse,
  readJsonBody,
} from "@/lib/backend";
import { getUsableServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getUsableServerSession();

  if (!session?.accessToken) {
    return Response.json(
      { title: "Unauthorized", status: 401 },
      { status: 401 },
    );
  }

  const body = await readJsonBody(request);
  if (body instanceof Response) return body;
  const response = await fetchBackend("/v1/users/me/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!response.ok) {
    return problemResponse(response);
  }

  session.hasCompletedOnboarding = true;
  await session.save();

  return new Response(null, { status: 204 });
}

export async function PUT() {
  const session = await getUsableServerSession();

  if (!session?.accessToken) {
    return Response.json(
      { title: "Unauthorized", status: 401 },
      { status: 401 },
    );
  }

  session.hasCompletedOnboarding = await getHasCompletedOnboarding(
    session.accessToken,
  );
  await session.save();

  return new Response(null, { status: 204 });
}
