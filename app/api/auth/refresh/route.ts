import { problemResponse, publicUser, refreshSession } from "@/lib/backend";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  const nextSession = await refreshSession(session);

  if (!nextSession) {
    session.destroy();
    return problemResponse(
      new Response(null, { status: 401, statusText: "Unauthorized" }),
    );
  }

  Object.assign(session, nextSession);
  await session.save();

  return Response.json(publicUser(nextSession.user));
}
