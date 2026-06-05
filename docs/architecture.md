# Architecture

## BFF (Backend-for-Frontend) pattern

All API communication goes through a Next.js server-side proxy. The browser never talks directly to the .NET API.

- **Tokens never reach the browser.** Access + refresh tokens are sealed in an encrypted httpOnly cookie via `iron-session`. The cookie holds `{accessToken, refreshToken, expiresAt, user: {id, email, role}}` — no permissions, no display name.
- **Single proxy chokepoint.** All API calls route through `/api/proxy/[...path]`, which reads the cookie, checks token expiry, refreshes silently if needed, attaches `Authorization: Bearer <jwt>`, and forwards the request.
- **BFF auth routes** (`/api/auth/*`) handle login, register, logout, refresh, and session. They proxy to the .NET backend and seal/clear the cookie.
- **Next.js Proxy** (`proxy.ts` — formerly Middleware) runs on every navigation for coarse route protection only — checks cookie existence and expiry, redirects to `/login` or `/onboarding`. It does NOT check permissions.

## Permission model

Permissions are NOT stored in the cookie (to avoid the 4KB limit). They are fetched through the BFF boundary and hydrated into React Query. Two layers coexist:

- **Global / platform permissions** — from `GET /v1/users/me`. Used for app-wide capabilities (admin features, platform actions).
- **Per-org scoped permissions** — from `GET /v1/organizations/my`, one `permissions: string[]` array per membership. Used inside the `/app/o/[slug]/...` shell.

| Layer                | Reads from                  | Can check                                              |
| -------------------- | --------------------------- | ------------------------------------------------------ |
| Next.js Proxy        | Cookie (existence + expiry) | Authenticated? Onboarded?                              |
| Server components    | Cookie + backend profile    | Route data, redirects, global permissions              |
| Client components    | Hydrated React Query cache  | Everything — role, global + org permissions, profile   |
| `<Can>` (no `inOrg`) | `/v1/users/me`              | Global checks, e.g. `audit.trail.read`                 |
| `<Can inOrg={id}>`   | `/v1/organizations/my`      | Org-scoped checks, e.g. `organizations.members.manage` |
| `useCanInActiveOrg`  | `/my` + `OrgContext`        | Org-scoped checks that also grant `PlatformOverride`   |

`PlatformOverride` is the access mode for global admins acting on an org they are not a member of. They will not appear in `/v1/organizations/my`, so a raw `<Can inOrg=...>` will hide UI for them; `useCanInActiveOrg` reads `accessMode` from `OrgContext` and grants them through. See [`components/organizations/AGENTS.md`](../components/organizations/AGENTS.md) for the full contract.

## Server-default query pattern

Route-critical reads default to server prefetch with React Query hydration:

1. Server pages/layouts create a per-request `QueryClient` with `createQueryClient()`.
2. Generated TanStack Query options are prefetched with `client: serverClient`.
3. The dehydrated state is passed through `HydrationBoundary`.
4. Client components keep using the same generated `useQuery` options for cache reads, invalidation, and client transitions.

Use client-only queries for hidden, lazy, polling, or highly interactive data. Examples include notification dropdown contents and background refreshes after a mutation.

`AuthHydration` is the protected-layout entry point for session/current-user data. `AuthProvider` still exposes `useAuth()` to client components, but protected routes should not depend on a client effect to discover the current user.

## Route groups and the three-scope app shape

```
app/
  (marketing)/    — public branded pages served at `/`
  (public)/       — unauthenticated auth flows (login, register, forgot-password, reset-password, confirm-email, goodbye, invite landing)
  (onboarding)/   — requires auth, shown before onboarding is complete
  (app)/app/      — requires auth + completed onboarding; reshaped into three scopes
    page.tsx              — cross-org dashboard (the `/app` landing)
    layout.tsx            — group layout, accepts `{ children, modal }`
    me/                   — personal scope: `/app/me`, `/app/me/settings/*`
    o/[slug]/             — org scope: overview, members, invitations, audit, settings
    organizations/        — `/app/organizations` (list) and `/app/organizations/new`
    admin/                — platform-admin scope: users, invitations, audit trail
    @modal/               — parallel slot for intercepted modals (e.g. create-org)
    settings/[[...slug]]  — legacy redirect → `/app/me/settings/...` (slated for removal)
    notifications/        — notifications page (not in sidebar nav)
  api/auth/       — BFF auth routes
  api/proxy/      — catch-all proxy
```

Personal settings used to live at `/app/settings/*`; they moved to `/app/me/settings/*` to keep the URL tree aligned with the three-scope shape (personal / org / cross-org). The `[[...slug]]` route preserves external links during the deprecation window — see `docs/follow-ups.md` (`legacy-redirect-cleanup`).

### Intercepted modals (`@modal/`)

`(app)/app/layout.tsx` accepts `{ children, modal }` and renders both. Pages under `@modal/(.)…` intercept client-side navigations and render as dialogs over the originating route, while the standalone page at the canonical URL still works for hard-refresh and deep links. The current example is `@modal/(.)organizations/new/page.tsx` wrapping the standalone `organizations/new/page.tsx`.

Full recipe — including the `(.)` matcher rule (slots are not segments) and form-sharing pattern — in [`components/AGENTS.md`](../components/AGENTS.md).

## Active-org context

Two contexts cooperate on the org side:

- **`OrgContext`** (`lib/org-context.ts`) — strict. Provided by `app/(app)/app/o/[slug]/layout.tsx` after resolving the slug. Carries `{ organizationId, slug, name, role, accessMode }`. Use `useOrg()` inside the org shell; throws if used outside.
- **`ActiveOrgContext`** (`lib/active-org-context.ts`) — relaxed, cross-app. Provided by `<ActiveOrgProvider>` near the top of `(app)`. Resolves a "currently selected org" from URL → `OrgContext` → localStorage pin → first org in `/my`. Used by the global sidebar's middle section so the org switcher persists across cross-org and personal routes.

For permission checks tied to a specific org, prefer `useOrg()` + scoped permission hooks. `useActiveOrg()` is for the cross-app sidebar and similar surfaces that need to answer "which org are we conceptually in right now?"

## Admin access pattern

Admin features live under `app/(app)/app/admin/*` and use two complementary layers of gating:

- **Discoverability gating** — the shared `AdminShell` (`components/admin/admin-shell.tsx`) reads the user's hydrated permissions from React Query and hides sidebar links the user lacks. If no admin permissions resolve, the shell renders an "Access denied" card instead of children.
- **Server routing** — the admin landing page reads the current user on the server and redirects to the first route listed in `lib/admin-routes.ts` that the user can access.
- **Authorization** — the backend continues to enforce permissions on every endpoint. The frontend gate is a UX layer; it never replaces the API check.

When adding a new admin page, place it in `app/(app)/app/admin/<feature>/`, declare its required permission in `lib/admin-routes.ts`, server-prefetch route-critical reads, and rely on the backend's 403 if the gate is bypassed.

## Organizations module

The Organizations module is the first multi-tenant resource in the app. Frontend-side, it introduces several conventions that are documented near the code rather than duplicated here:

- [`components/organizations/AGENTS.md`](../components/organizations/AGENTS.md) — backend contract crib sheet (`accessMode`, anti-enumeration on invitations, role rank, last-owner protection, PATCH-with-full-body, soft-delete, raw-token-shown-once, account-deletion + sole-ownership).
- [`lib/AGENTS.md`](../lib/AGENTS.md) — subscribe-vs-peek rule for React Query, the `useCanInActiveOrg` carve-out for `PlatformOverride`, constants-vs-magic-strings catalog (`ACCESS_MODE`, `ORG_ERRORS`, `ORG_PERMISSION`, `ORG_ROLES`).
- [`docs/adr/0010-org-scoped-permissions-and-platform-override.md`](adr/0010-org-scoped-permissions-and-platform-override.md) — architectural record of the per-org permission model and override path.
