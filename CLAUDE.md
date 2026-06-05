@AGENTS.md

# Modulith Frontend

Next.js companion app for the Modulith .NET backend. This is a template project — the frontend is a separate repo, communicating with the backend exclusively through its OpenAPI spec.

## Architecture

Full detail in `docs/architecture.md`. Key constraints:

- **Tokens never reach the browser.** All API calls go through the BFF proxy (`/api/proxy/[...path]`) which manages token attachment and silent refresh.
- **Permissions are fetched client-side** in two layers: global permissions via `GET /v1/users/me`, per-org scoped permissions via `GET /v1/organizations/my`. Neither is stored in the cookie.
- **Server prefetch + client hydration is the default.** For route-critical first-paint reads, prefetch in the server component with `client: serverClient` and pass dehydrated state through `<HydrationBoundary>`. React Query still owns the data lifecycle on the client (refetch, invalidate, mutate). See `docs/adr/0009-server-default-query-hydration.md`.
- **What's off-limits:** (a) calling `fetch` directly against the .NET backend from server components — always go through the generated client with `client: serverClient` so the proxy/session boundary still applies; (b) **server actions** for mutations — keep mutations client-side so the ProblemDetails mapper, optimistic updates, and toast handling run uniformly; (c) server components that **own** data lifecycle (fetch + pass plain data as props, bypassing React Query). Prefetch warms the cache; it doesn't replace it.

## Code generation

Types are generated from `openapi.json`, not hand-written. Full pipeline detail in `docs/codegen.md`.

## Error handling — ProblemDetails

The .NET backend returns RFC 9457 `ProblemDetails` consistently. A single mapper (`api/problems.ts`) converts them:

- **Validation errors** (status 400 with `errors` object) → mapped to TanStack Forms field errors.
- **Business errors** (status 409, 404, 422, etc.) → displayed as toast notifications via Sonner.
- **Auth errors** (status 401) → trigger token refresh or redirect to login.

All mutations must use this mapper. Do not write custom error handling per form.

## Technology choices

Check `docs/tech-choices.md` before adding dependencies. Do not substitute alternatives for the established stack.

## Key files and their roles

```
api/client.ts             — configured fetch client (base URL: /api/proxy)
api/problems.ts           — ProblemDetails → form errors / toast mapper
api/generated/            — auto-generated types, zod schemas, query hooks (DO NOT EDIT)
lib/session.ts            — iron-session config and session type definition
lib/sse.ts                — SSE client (EventSource + reconnect + query invalidation)
lib/safe-next-path.ts     — validator for the `?next=` post-login redirect target
lib/org-context.ts        — strict `useOrg()` inside the org shell (slug, role, accessMode)
lib/active-org-context.ts — relaxed `useActiveOrg()` for cross-app surfaces (sidebar)
lib/org-permissions.ts    — `useHasOrgPermission`, `hasOrgPermission` (subscribe vs peek)
lib/active-org-permissions.ts — `useCanInActiveOrg`, PlatformOverride-aware
lib/org-permission-strings.ts — backend permission constants (`ORG_PERMISSION`)
lib/org-roles.ts          — role rank + escalation rules (`ORG_ROLES`)
lib/org-errors.ts         — backend error-code constants + extension helpers
lib/org-access-mode.ts    — `ACCESS_MODE` constants
components/auth-provider  — React context: useCurrentUser, isAuthenticated, hasPermission
components/can.tsx        — `<Can permission="...">` for global, `<Can inOrg={id} permission="...">` for org-scoped
components/organizations/active-org-provider.tsx — `<ActiveOrgProvider>` (URL + pin + /my resolution)
components/ui/            — shadcn/ui components (managed by shadcn CLI)
proxy.ts                  — Next.js Proxy (formerly middleware): route protection, onboarding gate, and `?next=` param for post-login redirects
```

## Conventions

### File organization

- Pages go in `app/(marketing)/`, `app/(public)/`, `app/(onboarding)/`, or `app/(app)/app/` based on auth requirements:
  - `(marketing)/` — public, branded pages served at `/` (landing, future pricing/about).
  - `(public)/` — unauthenticated auth flows (login, register, password reset, confirm email, invite landing, goodbye).
  - `(onboarding)/onboarding/` — post-signup onboarding step.
  - `(app)/app/` — authenticated application; everything inside renders under the `/app` URL prefix and is gated by the `(app)` group layout (server-side `AuthHydration`).
- The `/app` tree is shaped around three scopes plus a parallel modal slot:
  - `me/` — personal scope (settings, profile, security, data; `/app/me/settings/*`).
  - `o/[slug]/` — org scope (overview, members, invitations, audit, settings — slug, never UUID, in the URL).
  - `organizations/` — cross-org list and `/new`.
  - `admin/` — platform-admin features.
  - `@modal/` — parallel slot for intercepted modals; see [components/AGENTS.md](components/AGENTS.md) for the recipe.
- BFF API routes go in `app/api/auth/` or `app/api/proxy/`.
- Shared components go in `components/`. Page-specific components stay in the page's directory.

### Patterns

- Use `"use client"` only when the component needs browser APIs, event handlers, or hooks. Default to server components.
- Forms: create with TanStack Forms, validate with generated Zod schemas, submit via generated mutation hooks, handle errors with the ProblemDetails mapper.
- Mutations: always invalidate relevant React Query caches on success. Use `queryClient.invalidateQueries()`. After mutations that can change scope (`changeRole`, `acceptInvitation`, `removeMember`, `createOrganization`, `deleteOrganization`), invalidate `listMyOrganizationsQueryKey()`.
- Loading states: use Suspense boundaries and skeleton components from `components/ui/skeleton`.
- Navigation: use Next.js `<Link>` component. Do not use `window.location` or `router.push` for normal navigation.
- Permission checks: see [lib/AGENTS.md](lib/AGENTS.md) for the subscribe-vs-peek rule. Inside the org shell, prefer `useOrg()` + `useHasOrgPermission`. For sidebar/cross-app gates that must also pass `PlatformOverride` admins, use `useCanInActiveOrg`.

### React 19 conventions

- **Context:** Use `React.use(MyContext)` instead of `React.useContext(MyContext)`. The `use()` hook is the React 19 way and supports conditional calls.
- **Refs:** Pass `ref` as a regular prop. Do not use `forwardRef` — it is unnecessary in React 19.
- **Composition:** Prefer compound components (e.g., `Dialog`, `DialogTrigger`, `DialogContent`) over boolean props that toggle modes. Create explicit variant components instead of adding `isX` flags.

### Hydration

- `suppressHydrationWarning` on `<html>` is specifically for `next-themes` (class attribute differs between server and client). Do not spread this attribute to other elements to mask real hydration issues.
- Prefer CSS-based responsive design (Tailwind breakpoints) over `useIsMobile` hooks that cause hydration mismatches. The `hooks/use-mobile.ts` hook initializes as `undefined` on the server, causing a flash when it resolves client-side.
