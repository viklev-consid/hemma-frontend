# 0003 - Split Authentication, Onboarding, And Permissions By Runtime Layer

Date: 2026-05-13

Status: Accepted

## Context

The app needs authentication, onboarding gates, role checks, and fine-grained permission-gated UI. These checks happen in different runtimes with different data access:

- Next.js Proxy can inspect cookies before page rendering.
- Route handlers can read and update the encrypted session.
- Server components can read server-only session data.
- Client components can use React Query and generated API calls.

The cookie must stay small and must not become a full authorization payload.

## Decision

Authentication, onboarding, and permissions are split by layer:

| Layer             | Reads From                                       | Responsibility                                                            |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| `proxy.ts`        | Sealed session cookie                            | Coarse redirects for authenticated, unauthenticated, and onboarding flows |
| `app/api/auth/**` | `iron-session` and backend auth endpoints        | Login, register, logout, refresh, password flows, session exposure        |
| Server components | Server-only session helpers and backend profile  | Route data, redirects, onboarding gates, permission-aware routing         |
| `AuthHydration`   | Server session and `GET /v1/users/me`            | Hydrate session/current-user React Query state for protected routes       |
| `AuthProvider`    | Hydrated React Query state, with client fallback | Client auth actions, current profile, permissions for interactive UI      |
| `<Can>`           | Hydrated React Query current-user data           | Fine-grained permission-gated UI                                          |

The session cookie stores access token, refresh token, expiry, and minimal public identity. Permissions are fetched from `GET /v1/users/me` through the BFF boundary and hydrated into React Query for protected routes.

> **Update (ADR 0010):** Per-org scoped permissions are now a first-class second layer, sourced from `GET /v1/organizations/my`. The table above and the `<Can>` row in particular describe the global layer only. See [ADR 0010](0010-org-scoped-permissions-and-platform-override.md) for the org-scoped guards (`<Can inOrg=...>`, `useHasOrgPermission`, `useCanInActiveOrg`) and the `PlatformOverride` carve-out.

## Consequences

The cookie remains small and sensitive data stays out of client JavaScript. Permission checks can evolve with backend claims without changing the cookie format.

Middleware-style redirects remain fast and coarse. Protected layouts perform server-side profile hydration so route-critical UI does not wait for client auth bootstrapping. Fine-grained authorization remains backed by the current user profile and enforced by the backend.

## Agent Guidance

Do not add permissions or large profile payloads to the session cookie.

Do not rely on `proxy.ts` for fine-grained permissions. Proxy should answer only questions like:

- Is there a usable session?
- Should an authenticated user be redirected away from public auth pages?
- Has onboarding been completed enough to enter protected app routes?

Use server-side current-user reads for route redirects and initial protected data. Use `<Can>` or `hasPermission`-style client logic for interactive permission-gated UI. When changing permission-gated UI, validate permission strings against backend API/contract data.

When returning session data to the browser, use `publicUser()` or equivalent minimal data. Never return tokens.
