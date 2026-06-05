import { publicUser } from "@/lib/backend";
import { getUsableServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getUsableServerSession();

  if (!session?.user) {
    return Response.json(
      { title: "Unauthorized", status: 401 },
      { status: 401 },
    );
  }

  return Response.json(publicUser(session.user));
}
