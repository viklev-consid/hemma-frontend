import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { hasRefreshableSession, unsealSessionCookie } from "@/lib/session";

const publicRoutes = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/confirm-email",
  "/goodbye",
  // Invite landing must be reachable both signed-in (one-click accept)
  // and signed-out (prompt to register/sign in). The page itself
  // branches on session state.
  "/invite",
]);

const publicPrefixes = ["/login/"];

function isPublicRoute(pathname: string) {
  return (
    publicRoutes.has(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await unsealSessionCookie(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  // Optimistic routing guard only. Route handlers and server data loaders
  // validate or refresh the access token before reaching protected data.
  const hasSession = Boolean(session && hasRefreshableSession(session));

  if (!hasSession && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (
    hasSession &&
    (pathname === "/login" ||
      pathname.startsWith("/login/") ||
      pathname === "/register")
  ) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (
    hasSession &&
    session?.hasCompletedOnboarding !== true &&
    pathname !== "/onboarding" &&
    !isPublicRoute(pathname)
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
