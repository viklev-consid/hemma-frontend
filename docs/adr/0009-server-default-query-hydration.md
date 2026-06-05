# 0009 - Prefer Server Defaults With React Query Hydration

Date: 2026-05-14

Status: Accepted

## Context

The app uses Next.js App Router, a BFF proxy, and Hey API generated TanStack Query options. Early screens leaned on client-side queries for initial reads, including auth bootstrap, admin tables, detail views, and settings pages.

That worked, but it made first render depend on browser query startup, pushed redirect decisions into effects, and widened client component boundaries.

## Decision

Initial route data should be fetched on the server by default, then dehydrated into React Query when the client component tree still benefits from `useQuery`.

Use this pattern for route-critical reads:

1. Create a per-request query client with `createQueryClient()`.
2. Prefetch generated query options in the server page or layout.
3. Use `serverClient` for generated API calls so requests keep the BFF/session boundary.
4. Render a `HydrationBoundary` with `dehydrate(queryClient)`.
5. Keep the client component on the same generated `useQuery` option so mutations, invalidation, and background refresh continue to work.

Auth/current-user data is hydrated by protected layouts through `AuthHydration`. Client auth context remains the ergonomic way for interactive components to read current user and permissions, but it should not be the first source of route-critical auth data.

## Consequences

Hard refreshes and first navigations can render with data already available. Redirects and onboarding gates happen during server render instead of client effects. React Query remains the server-state cache for client transitions, mutations, invalidation, and live UI.

Some protected pages become dynamic because they read session-backed data. That is expected for authenticated application routes.

## Agent Guidance

Default to server prefetch plus hydration for page reads that are needed on first paint.

Use client-only queries for data that is hidden, lazy, polling, highly interactive, or only needed after the user opens a surface.

Do not hand-edit generated files under `api/generated`. If generated query options are used on the server, pass `client: serverClient`.

Keep mutation flows client-side unless a Server Action provides a clear product benefit. After client mutations, invalidate the matching query keys and call `router.refresh()` only when server-rendered layout data must update.
