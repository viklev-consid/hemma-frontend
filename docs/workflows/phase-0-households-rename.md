# Phase 0 — Households Rename · Execution Plan

> Execution detail for **Phase 0** of [`economy-household-frontend-plan.md`](../../economy-household-frontend-plan.md).
> Source-plan goal: _"reflect Organizations → Households across routing, hooks, and RBAC."_
> Acceptance: all routes resolve under `/h/[slug]`; members can use the shared workspace; no dead `/o/` links.

## Status of prerequisites

- ✅ **API client regenerated.** `pnpm api:sync` + `pnpm api:generate` already run against the new backend spec. `organization` is gone from the contract (0 refs); households + economy are present; the TickerQ scheduler surface is removed.
- ✅ **Backend RBAC confirmed & typed.** Generated client now exposes `HouseholdRole = 'owner' | 'member'` and `PlatformRole = 'admin' | 'user'` as distinct enums (plus `zHouseholdRole`). Platform `admin` is a separate concept from household membership.
- ⚠️ **The regenerated client currently breaks the build** — ~102 typecheck errors across 18 files, because every `*Organization*` operation/type was renamed to `*Household*`. That breakage _is_ the Phase 0 work surface. The branch must not be merged until it's green.

This is a large, mostly-mechanical rename (~395 `organization` refs in `components/`, ~169 in `lib/`, ~53 in `app/`, ~61 in `messages/`). It should land as **one atomic feature branch**, never half-applied on `main`.

---

## Open questions — resolve BEFORE coding (cannot be derived from the spec)

These are runtime values the OpenAPI contract does not enumerate. Guessing wrong = silently-failing guards.

1. ~~**Permission namespace.**~~ ✅ **RESOLVED (2026-06-08, backend-confirmed):** namespace renamed to `households.*`. New `HOUSEHOLD_PERMISSION` constants (replace `ORG_PERMISSION`):

   | Const               | String                          | Owner | Member |
   | ------------------- | ------------------------------- | :---: | :----: |
   | `HouseholdRead`     | `households.households.read`    |   ✓   |   ✓    |
   | `HouseholdWrite`    | `households.households.write`   |   ✓   |        |
   | `HouseholdDelete`   | `households.households.delete`  |   ✓   |        |
   | `MembersRead`       | `households.members.read`       |   ✓   |   ✓    |
   | `MembersManage`     | `households.members.manage`     |   ✓   |        |
   | `InvitationsManage` | `households.invitations.manage` |   ✓   |        |
   | `AuditRead`         | `households.audit.read`         |   ✓   |        |
   - **`households.platform.override`** is a _declared_ permission but is **not** returned in a membership array from `/v1/households/my` — it corresponds to the `PlatformOverride` access mode, not a household-member grant. Don't add it to `HOUSEHOLD_PERMISSION`.
   - `permissionsVersion` changed (it's computed from the strings): owner `9Pi8gtuDoC5B8seM`, member `ve4JjXpYCn0QenUq`. The FE treats `permissionsVersion` as an opaque backend cache key — confirm nothing hardcodes/pins it (it shouldn't).
   - ⚠️ **Design note for the Economy phases (not Phase 0):** a `member`'s household permissions are read-only (`households.read`, `members.read`). Per the source plan's global rule ("both owner and member can use normal Economy actions; no owner-only gating"), **Economy mutations must be gated on household _membership_, not on these `households.*` permission strings.** Do not reuse `MembersManage`/`HouseholdWrite` to gate transactions/transfers/budgets.
   - → Run the **`permission-review`** skill after WS2/WS3.

2. ✅ **RESOLVED (2026-06-08, backend-confirmed) — with a discriminator caveat.** Error namespace is now `Households.*`, but names restructured (not 1:1). Mapping for `lib/household-errors.ts`:

   | Old (`Organizations.*`)                  | New                                                                                                                                        |
   | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
   | `Organizations.NotFound`                 | `Households.Household.NotFound`                                                                                                            |
   | `Organizations.Slug.Taken`               | `Households.Slug.AlreadyExists`                                                                                                            |
   | `Organizations.Invitation.Invalid`       | `Households.Invitation.Invalid`                                                                                                            |
   | `Organizations.Owner.LastOwnerRequired`  | `Households.Owner.LastOwnerRequired`                                                                                                       |
   | `Organizations.Owner.UserErasureBlocked` | `Households.Owner.UserErasureBlocked`                                                                                                      |
   | `Organizations.Role.EscalationForbidden` | **no 1:1** → now `Households.PlatformOverride.MutationForbidden`, `Households.Role.Invalid`, or an owner-invariant error depending on path |
   | `Organizations.RegistrationUnavailable`  | **moved out of household scope** → `Users.Registration.Unavailable` (handle in users/auth error mapping, not household)                    |

   New codes also available: `Households.Household.Deleted`, `Households.Name.Empty/TooLong`, `Households.Slug.Empty/Invalid/TooLong`, `Households.Member.AlreadyExists/NotFound`, `Households.Household.ConcurrencyConflict`, `Households.Query.PageSizeInvalid`, `Households.Invitation.AlreadyAccepted/AlreadyRevoked/LifetimeInvalid`.

   **🔴 Discriminator caveat (affects the ProblemDetails mapper, `api/problems.ts`):** the error code lives in different places depending on the path —
   - **Validation errors** → code is a **key in the `errors` object** (already handled by the validation→form-field path).
   - **Some Users flows** (e.g. account deletion blocked by ownership) → **`extensions.errorCode`** (e.g. `Households.Owner.UserErasureBlocked`).
   - **Most household non-validation endpoints** (`ToProblemDetailsOr`) → currently expose only `title/status/detail`, **no `errorCode` at all.**

   So the FE mapper must (a) read `problem.extensions?.errorCode` when present, (b) fall back to `errors`-key matching for validation, and (c) **degrade gracefully to a status-based generic toast** when no code is present — do **not** assume a specific household business code is always readable. Backend acknowledged the missing-`errorCode` exposure as a consistency gap to fix → logged in [`docs/follow-ups.md`](../follow-ups.md).

3. ~~**Locale decision.**~~ ✅ **RESOLVED (2026-06-08):** Phase 0 does a **1:1 Organization → Household rename in the existing English copy**. No locale migration here — Swedish is a dedicated full-translation PR later. `sv/` is explicitly out of scope for this branch.

> ✅ All three open questions are now resolved (backend-confirmed 2026-06-08). The mechanical rename and verification can proceed end to end. The only residual is a backend follow-up (item 2's `errorCode` exposure gap) tracked in [`docs/follow-ups.md`](../follow-ups.md) — the FE handles it defensively in the interim.

---

## Design decisions

- **Derive RBAC from the generated enum, don't re-hand-roll it.** Replace the hand-maintained `ORG_ROLES = ["owner","admin","member"]` with a list/rank built on the generated `HouseholdRole` (`'owner' | 'member'`). This both fulfils "RBAC reflects owner | member" _and_ kills the drift risk that made `admin` wrong in the first place. The local FE role type should be (or alias) the generated `HouseholdRole`.
- **Naming clash to watch:** the generated client already exports a type named `HouseholdRole`. The FE's role module must not redefine a conflicting `HouseholdRole`; import the generated one and build helpers (`rank`, `rolesBelow`, `formatRoleLabel`) around it.
- **Redirects over dead links.** Deep links to `/app/o/:slug` exist in the wild (e.g. onboarding builds `next=/app/o/${slug}`). Add a permanent redirect `/(app)/app/o/:slug*` → `/(app)/app/h/:slug*` in `next.config.mjs` (`async redirects()`), and fix all internal link sources so no _new_ `/o/` links are emitted.
- **Keep platform-admin paths untouched.** `lib/global-roles.ts` (`GLOBAL_ROLE.Admin`), `ChangeUserRole`, and the `admin/` route tree are the separate platform surface — do not fold them into the household rename.

---

## Workstreams (suggested order — each ends green-or-closer on typecheck)

### WS1 — RBAC core (`owner | member`)

- `lib/org-roles.ts` → `lib/household-roles.ts`. Build role list/`RANK` from generated `HouseholdRole`; drop `admin` (rank: `owner` > `member`). Update `rolesBelow` (owner may assign/invite `member` only), `roleRank`, `formatRoleLabel`, `isHigherOrEqualRank`.
- `components/organizations/org-role-badge.tsx`: remove the `admin` branch; owner/member only.
- Update `lib/org-roles.test.ts` accordingly.

### WS2 — `lib/` rename

- Rename + retarget: `org-context.ts`→`household-context.ts` (`useOrg`→`useHousehold`), `active-org-context.ts`, `active-org-permissions.ts` (`useCanInActiveOrg`), `org-permissions.ts` (`useHasOrgPermission`/`hasOrgPermission`), `org-permission-strings.ts` (`ORG_PERMISSION`→`HOUSEHOLD_PERMISSION`, **+ namespace from open-Q #1**), `org-access-mode.ts` (values `ScopedPermission`/`PlatformOverride` now ship as generated `HouseholdAccessMode` enum — reference it), `org-errors.ts` (**+ codes from open-Q #2**), `org-switch-target.ts`.
- Update all generated-hook imports: `listMyOrganizationsOptions` → `listMyHouseholdsOptions`, `getOrganizationOptions` → `getHouseholdOptions`, `MyOrganizationItem` → `MyHouseholdItem`, etc. (full old→new map in the appendix).
- Update co-located `*.test.ts`.

### WS3 — `components/` rename

- `components/organizations/` → `components/households/`; file names `org-*`→`household-*` (`org-shell`, `org-switcher`, `org-list`, `org-audit-table`, `create-org-form`, `edit-org-form`, `delete-org-dialog`, `create-invite-dialog`, `invitations-table`, `members-table`, `role-change-dialog`, `active-org-provider`, `org-overview`, `org-role-badge`, `create-org-modal`).
- `components/auth-provider.tsx`, `components/can.tsx` (`inOrg`→`inHousehold`? — decide prop naming; keep `<Can>` API consistent), `components/invite/invite-landing.tsx`, `components/app-shell/org-nav.tsx`→`household-nav.tsx`, `components/app-shell/breadcrumb-config.ts`, `components/settings/data-settings.tsx`.
- Repoint generated mutation hooks: `create/delete/updateOrganization*`, `*OrganizationInvitation*`, `*OrganizationMember*`, `getOrganizationAudit` → household equivalents.

### WS4 — Routing

- Rename dir `app/(app)/app/o/` → `app/(app)/app/h/` (layout, page, members, invitations, audit, settings).
- Rewrite every internal link `/app/o/${slug}` → `/app/h/${slug}` (sources found in `org-shell`, `org-list`, `create-org-form`, `create-org-modal`, `edit-org-form`, `data-settings`, `org-nav`, `breadcrumb-config`, `onboarding/page.tsx`).
- Add `redirects()` in `next.config.mjs`: `/app/o/:slug*` → `/app/h/:slug*` (permanent).
- Decide fate of `app/(app)/app/organizations/` (cross-org list + `/new`) and the `@modal/(.)organizations` intercept → rename to `households` and update the intercept matcher + the `<Link href="/app/organizations/new">` sources. **Read `node_modules/next/dist/docs/` on intercepting routes before touching the `@modal` slot** (per AGENTS.md) — the `(.)` matcher is path-sensitive.

### WS5 — i18n copy (English, 1:1 rename — see open-Q #3)

- `messages/en/organizations.json` → `households.json`; update `messages/en/index.ts` namespace registration.
- Replace "organization(s)" → "household(s)" copy in `app.json`, `onboarding.json`, `invite.json`, `metadata.json`, `settingsForms.json`. Drop the `admin` role label.

### WS6 — Tests

- `breadcrumb-config.test.ts` (`/app/o/`→`/app/h/`, "Organization"→"Household" label), `org-switch-target.test.ts`, `org-permissions.test.ts`, `org-roles.test.ts`. Rename files to match modules.

---

## Verification gates (per AGENTS.md post-implementation protocol)

1. `pnpm typecheck` + `pnpm lint` — must reach 0 errors (baseline: 102).
2. `pnpm test --run` — all renamed tests green.
3. `pnpm build` — **required**: routing, layouts, and the `@modal` intercept all changed.
4. **`permission-review` skill** — validates the new permission strings/guards (open-Q #1). Mandatory: permission-gated UI changed.
5. **`bff-route-review` skill** — only if any `app/api/**` route touches the renamed paths (audit proxy paths may).
6. `npx -y react-doctor@latest . --verbose --diff` — no score regression from the component churn.
7. Manual smoke: hit a stale `/app/o/<slug>` URL → confirm it 308-redirects to `/app/h/<slug>`.

---

## Appendix — old → new operation/type map (from regenerated client)

| Old (organization)                               | New (household)                                   |
| ------------------------------------------------ | ------------------------------------------------- |
| `listMyOrganizations` / `…Options` / `…QueryKey` | `listMyHouseholds`                                |
| `getOrganization`                                | `getHousehold`                                    |
| `createOrganization`                             | `createHousehold`                                 |
| `updateOrganization`                             | `updateHousehold`                                 |
| `deleteOrganization`                             | `deleteHousehold`                                 |
| `listOrganizationMembers`                        | `listHouseholdMembers`                            |
| `changeOrganizationMemberRole`                   | `changeHouseholdMemberRole`                       |
| `removeOrganizationMember`                       | `removeHouseholdMember`                           |
| `listOrganizationInvitations`                    | `listHouseholdInvitations`                        |
| `createOrganizationInvitation`                   | `createHouseholdInvitation`                       |
| `acceptOrganizationInvitation`                   | `acceptHouseholdInvitation`                       |
| `revokeOrganizationInvitation`                   | `revokeHouseholdInvitation`                       |
| `getOrganizationAudit`                           | `getHouseholdAudit`                               |
| `MyOrganizationItem`                             | `MyHouseholdItem`                                 |
| type `OrgRole` (hand-rolled)                     | generated `HouseholdRole` (`'owner' \| 'member'`) |
| path param `organizationRef`                     | `householdRef`                                    |

> ⚠️ The generic `createInvitation` / `listInvitations` / `revokeInvitation` ops (no `Household`/`Organization` prefix) are the **user-level** invitation surface — do not confuse them with the household-scoped ones.
