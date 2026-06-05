# 0007 - Use App Router Route Groups And Next Proxy Deliberately

Date: 2026-05-13

Status: Accepted

## Context

The app uses the Next.js App Router. Route groups make auth and product flows visible in the filesystem without changing URL paths. Next.js 16 names the request interception file `proxy.ts`, replacing the older Middleware naming in docs and conventions.

The local Next.js docs describe route handlers as the App Router primitive for custom request handlers, and Proxy as a request-time interception point for redirects, rewrites, and lightweight checks.

## Decision

Application routes should be organized by access pattern:

- `app/(marketing)` for public branded pages served at `/`.
- `app/(public)` for login, registration, password reset, email confirmation, invite landing, and goodbye flows.
- `app/(onboarding)` for authenticated users who have not completed onboarding.
- `app/(app)` for authenticated product routes as they are added.
- `app/api/auth` for auth-specific BFF route handlers.
- `app/api/proxy` for the generic backend API proxy.

Inside `app/(app)/app`, the tree is further organized into three scopes — personal (`me/`), org (`o/[slug]/`), and cross-org (`organizations/`) — alongside platform-admin (`admin/`) and a parallel `@modal/` slot for intercepted modals. URL slugs, not UUIDs, are the org identifier in user-facing routes.

`proxy.ts` performs only lightweight route protection and redirects. It should not perform slow backend fetches or become the source of fine-grained authorization.

## Consequences

The route tree communicates security posture to agents before they open implementation files. Public, onboarding, app, and API concerns stay separated.

Build-time routing behavior matters for these files, so route, layout, proxy, and server/client boundary changes need production builds during verification.

## Agent Guidance

When adding a page, choose the route group by access requirement before coding.

When adding a route handler, place it under `app/api/**` and use Web `Request`/`Response` APIs unless a Next-specific helper is needed.

When touching `proxy.ts`, consult the local Next.js Proxy docs under `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`. Keep work limited to fast, request-local checks.

When touching route handlers, consult `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`.

When adding a create-flow that should also work as a modal over its originator (e.g. create-org), use the parallel-routes + intercepting-routes recipe documented in [`components/AGENTS.md`](../../components/AGENTS.md). Both the standalone page and the intercepted variant must work on their own — the slot only intercepts client-side navigations.
