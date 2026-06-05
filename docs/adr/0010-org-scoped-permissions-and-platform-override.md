# 0010 - Org-Scoped Permissions And PlatformOverride

Date: 2026-05-23

Status: Accepted

## Context

ADR 0003 split authentication, onboarding, and permissions by runtime layer, with all permissions resolved from `GET /v1/users/me`. That model assumed a single global permission set per user.

The Organizations module introduces multi-tenant resources. The backend now exposes two distinct authorization layers:

- **Global / platform permissions** — properties of the user (e.g. `audit.trail.read`). Source: `/v1/users/me`.
- **Per-org scoped permissions** — properties of a `(user, organization)` pair (e.g. `organizations.members.manage` inside org X). Source: `/v1/organizations/my`, one `permissions: string[]` per membership.

Additionally, the backend supports a `PlatformOverride` access mode: a platform admin can read or write an organization they are not a member of. The override is enforced at the API; it never appears in the user's `/my` listing because the user has no membership.

The frontend needs guards that:

1. Distinguish global from per-org checks at the call site.
2. React to `/my` changes after mutations (role change, accept-invite, leave) without manual refetches in every component.
3. Don't hide UI from `PlatformOverride` admins on guards where the backend would accept their action.

## Decision

Per-org scoped permissions are first-class alongside global permissions. The split is made explicit at the API of the guard helpers:

| Form                                | Source                 | Use from                                                         |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| `<Can permission="..." />`          | `/v1/users/me`         | Global checks                                                    |
| `<Can permission="..." inOrg={id}>` | `/v1/organizations/my` | Org-scoped checks                                                |
| `useHasOrgPermission(orgId, perm)`  | `/v1/organizations/my` | Org-scoped render-time checks                                    |
| `useCanInActiveOrg(perm)`           | `/my` + `OrgContext`   | Sidebar / cross-app gates that must also pass `PlatformOverride` |
| `hasOrgPermission(qc, orgId, perm)` | Cache peek             | Event handlers, effects, tests                                   |

Render-time checks subscribe via `useQuery`. The non-hook `hasOrgPermission` is for non-render call sites only — it reads the cache without subscribing and would otherwise leave components stale after `/my` refresh.

`accessMode` from `GET /v1/organizations/{ref}` is carried in `OrgContext` alongside the resolved org. `useCanInActiveOrg` reads it and grants `PlatformOverride` callers through, since they will not appear in `/my`. Raw `<Can inOrg=...>` does not — its job is "does the caller have the per-org permission?", and the override answer to that question is "no, they have the platform override instead." Callers that need both branches should branch on `accessMode` explicitly.

Backend-shipped strings the UI branches on live as named constants in `lib/` (`ORG_PERMISSION`, `ORG_ROLES`, `ORG_ERRORS`, `ACCESS_MODE`). Backend renames then surface as TypeScript errors at call sites instead of silently broken guards.

After any mutation that can change scope — `changeRole`, `acceptInvitation`, `removeMember`, `createOrganization`, `deleteOrganization` — invalidate `listMyOrganizationsQueryKey()` so subscribers re-render with fresh permissions. The backend ships a `permissionsVersion` hash on each `MyOrganizationItem`; we do not poll it.

## Consequences

The global permission model from ADR 0003 stays correct for platform-level features. Org-scoped checks no longer try to live in `/v1/users/me`, which keeps that response small and stable.

Two concepts ("permission" and "access mode") have to coexist in guard code. The split is visible at the API: callers see whether they are reaching for the override-aware helper or the strict per-org one, which keeps the failure modes (hidden UI vs accepted action) predictable.

`/my` becomes a high-leverage cache. Every mutation that could change membership or role must invalidate it. Components that read it must subscribe, never peek.

## Agent Guidance

When adding a guard:

- Global feature → `<Can permission="..." />` or `usePermission(perm)`.
- Per-org feature inside the org shell → `<Can inOrg={orgId} permission="...">` or `useHasOrgPermission(orgId, perm)`.
- Sidebar / cross-app surface that must also work for `PlatformOverride` admins → `useCanInActiveOrg(perm)`.
- Event handler, effect, or test → `hasOrgPermission(qc, orgId, perm)`. Never call this during render.

Always import permission strings from `@/lib/org-permission-strings` (`ORG_PERMISSION.*`). Never write `"organizations.members.manage"` inline.

After mutations that change membership or role, invalidate `listMyOrganizationsQueryKey()`. The `permission-review` skill catches missed invalidations and stale strings.

When designing UI for an org route, decide up front whether the route is reachable under `PlatformOverride`:

- If yes: gate with `useCanInActiveOrg` or branch on `accessMode` and render the `<AccessModeBadge>` as the user-visible reminder.
- If no: gate strictly with `<Can inOrg=...>` and rely on the backend's 403 if reached anyway.

See [`components/organizations/AGENTS.md`](../../components/organizations/AGENTS.md) for the full backend contract crib sheet (anti-enumeration, role rank, last-owner protection, soft-delete, raw-token-once, account-deletion + sole-ownership) and [`lib/AGENTS.md`](../../lib/AGENTS.md) for the subscribe-vs-peek rule.
