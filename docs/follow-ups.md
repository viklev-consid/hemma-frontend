# Follow-ups

Items deferred during recent work — captured here so they don't drift
into folklore. Cross-reference from code via `TODO(<tag>):` and search
this file for the tag.

## org-pagination

**Where:** `components/organizations/members-table.tsx` — the
`activeOwnerCount` derivation.

**Why:** The members listing is unpaginated in v1, so counting owners
client-side is correct. If the API adds pagination, owners on
subsequent pages won't be counted, and the last-owner guard can permit
a destructive action (demote / remove / leave) that looks safe on page
1 but fails the backend's `Organizations.Owner.LastOwnerRequired`
check.

**Remediation when pagination lands:**

1. Backend: add `ownerCount` to `ListOrganizationMembersResponse` (or
   a dedicated `GET /organizations/{ref}/owners/count` endpoint).
2. Frontend: replace the client-side `members.filter(...).length`
   with the server-provided count.
3. Verify all three affordances (Leave, Remove, Demote) still hide on
   the only-owner row across pages.

## active-org-cross-tab-sync

**Where:** `components/organizations/active-org-provider.tsx` —
`usePinnedSlug` reads localStorage via a module-level emitter that
only fires for same-tab writes.

**Why:** Switching the active org in tab A doesn't broadcast to tab B.
Tab B's pinned slug stays stale until something else triggers a
re-read (route change, refresh).

**Remediation:** subscribe to `window.addEventListener("storage", ...)`
in the provider and call `notifyStorageChange()` on incoming events
that match our key prefix. Low priority — URLs remain the truth, only
the sidebar middle on cross-org / personal pages is affected.

## org-name-in-breadcrumb

**Where:** `components/app-shell/breadcrumb-config.ts` — the
`organizationsActive` crumb renders a static "Organization" label.

**Why:** Showing the actual org name in the crumb is friendlier but
requires either a hook variant of `resolveBreadcrumb` (so it can read
the active org from React Query) or a new `dynamicText` field on
`Crumb` that gets resolved in the header component.

**Remediation:** add a `dynamicText` slot to the `Crumb` type, set it
to the active org's name in the org trails, and resolve it inside
`AppHeader` where the React Query context is available.

## platform-override-discoverability

**Where:** `components/organizations/org-switcher.tsx` — only renders
orgs from `/v1/organizations/my`.

**Why:** A platform admin who can read any org via `PlatformOverride`
sees an empty picker when they have no memberships. They can deep-link
into `/app/o/<slug>/...` but can't browse.

**Remediation (backend):** extend `/v1/organizations/my` (or add a
parallel `/admin-visible` endpoint) to include orgs the caller can see
under override. The frontend then renders them, possibly grouped
("Your organizations" / "All organizations").

## legacy-redirect-cleanup

**Where:**

- `app/(app)/app/organizations/page.tsx` (redirects to `/app`)
- `app/(app)/app/settings/[[...slug]]/page.tsx` (redirects to `/app/me/settings/...`)

**Why:** Both routes exist purely as redirects to preserve external
links / bookmarks from the pre-restructure shape.

**Remediation:** delete both after one release. External links should
have either updated or fallen out of usage by then.

## household-errorcode-exposure

**Where:** backend — household endpoints using `ToProblemDetailsOr`;
consumed by the frontend ProblemDetails mapper (`api/problems.ts`) and
`lib/household-errors.ts` (formerly `lib/org-errors.ts`).

**Why:** Backend confirmed (2026-06-08, during Phase 0 households rename)
that most household **non-validation** ProblemDetails currently expose
only `title/status/detail` — **no `extensions.errorCode`**. Only
validation errors (code as an `errors` key) and a few Users flows
(`extensions.errorCode`, e.g. `Households.Owner.UserErasureBlocked`)
carry a machine-readable code. So the FE cannot reliably map many
household business errors (e.g. `Households.Slug.AlreadyExists`,
`Households.Owner.LastOwnerRequired`) to specific toasts — it must fall
back to generic status-based messaging. There is also no 1:1 successor
to the old `Organizations.Role.EscalationForbidden` (escalation now
surfaces as `Households.PlatformOverride.MutationForbidden`,
`Households.Role.Invalid`, or an owner-invariant error by path).

**Remediation (backend):** add `extensions.errorCode` to the household
`ToProblemDetailsOr` path for parity with the Users flows, so the
frontend mapper has a stable discriminator for non-validation business
errors. Backend flagged this as a known consistency gap to fix next.

**Frontend interim:** the mapper reads `problem.extensions?.errorCode`
when present, matches validation `errors` keys, and degrades to a
status-based generic toast otherwise — it must not assume a specific
household business code is always readable.
