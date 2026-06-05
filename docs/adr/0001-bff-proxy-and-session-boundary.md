# 0001 - Use A Next.js BFF Proxy As The Backend Boundary

Date: 2026-05-13

Status: Accepted

## Context

This frontend is paired with a .NET backend that owns authentication, authorization claims, and the REST API contract. The browser should not receive backend access tokens or refresh tokens, and frontend API calls need one place where token attachment, token refresh, request forwarding, and response normalization can be controlled.

Next.js App Router route handlers provide server-side request handlers under `app/api/**`. Next.js Proxy, implemented in this repository as `proxy.ts`, is appropriate for lightweight request-time redirects but should not become the full session or authorization implementation.

## Decision

All browser-to-backend API traffic must go through the Next.js BFF boundary:

- Browser API calls use `/api/proxy/...`.
- The catch-all proxy route lives at `app/api/proxy/[...path]/route.ts`.
- Authentication-specific frontend routes live under `app/api/auth/**`.
- Backend tokens are stored in an encrypted, httpOnly `iron-session` cookie.
- The browser receives only public user data, never access tokens or refresh tokens.
- The proxy attaches `Authorization: Bearer <accessToken>` server-side.
- The proxy refreshes nearly expired access tokens by using the refresh token server-side.
- Forwarded requests strip `host` and `cookie` before reaching the backend.
- BFF routes handling auth/session data must opt out of caching with `export const dynamic = "force-dynamic"`.

## Consequences

The frontend has a single security chokepoint for backend calls. Token handling is not duplicated across components, generated clients, or feature modules.

This also means the frontend intentionally gives up direct server component data fetching from the .NET backend for product data. Server components may read session state for coarse rendering decisions, but backend API data should flow through the BFF proxy and client-side server-state cache.

## Agent Guidance

When adding data fetching, do not call the .NET backend directly from browser code. Use the generated client configured with `/api/proxy`, or a route under `app/api/auth/**` for auth-specific behavior.

When adding or changing BFF routes:

- Use `getSession()` from `@/lib/session`.
- Use helpers from `@/lib/backend` for backend URL construction, backend fetch behavior, token response parsing, and problem response forwarding.
- Return only `publicUser()` data to the client when exposing session user information.
- Keep tokens and raw backend auth responses server-side.
- Strip inbound `host` and `cookie` headers from forwarded backend requests.
- Avoid stack traces or account enumeration details in client-visible errors.
