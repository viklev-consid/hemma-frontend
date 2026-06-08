# Organizations module — frontend contract crib sheet

This folder hosts the UI for the backend **Organizations** module. The
backend is authoritative; this guide records the non-obvious contract points
that aren't visible from the code alone, so an agent walking in cold can
make correct judgments without re-deriving them.

## Source-of-truth files in this repo

| Concern                                                        | File                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| Active-org context (slug → resolved org + role + accessMode)   | `lib/org-context.ts`                                        |
| Role rank + escalation rules                                   | `lib/org-roles.ts`                                          |
| Scoped-permission lookups (`/my` projections)                  | `lib/org-permissions.ts`                                    |
| Permission string constants                                    | `lib/org-permission-strings.ts`                             |
| Error-code constants + `BlockingOrganization` extension shape  | `lib/org-errors.ts`                                         |
| AccessMode constants (`ScopedPermission` / `PlatformOverride`) | `lib/org-access-mode.ts`                                    |
| Slug validation + suggestion                                   | `lib/slug.ts`                                               |
| URL convention                                                 | `app/(app)/app/o/[slug]/...` (slug, never UUID, in the URL) |

## Contract points the backend enforces — get them right client-side

### 1. `accessMode` is not the same as membership

Backend returns `accessMode` on `GET /v1/organizations/{ref}`:

- `"ScopedPermission"` — caller is a member, acting on their scoped permissions.
- `"PlatformOverride"` — caller is a global admin acting on an org they are
  **not a member of**. Reads succeed; the user will not appear in `/my`.

UI implications:

- The user's `/my` listing **will not contain** orgs they only access via
  override. `hasOrgPermission(orgId, ...)` therefore returns `false` for
  override admins — that is by design; their permission is the platform
  override itself, not a per-org permission.
- The `<AccessModeBadge>` is the user-visible reminder that they are acting
  outside their normal membership. It gates on `isPlatformOverride() && !isMember`.
- Code that branches on capability for override admins should additionally
  check `accessMode` from `OrgContext`, not just the scoped-permission read.

### 2. Anti-enumeration on invitations

Two backend errors must collapse to a single opaque client message:

- `Organizations.Invitation.Invalid`
- `Organizations.RegistrationUnavailable`

Never surface backend `title`/`detail` for these to the user. The intent is
that an attacker cannot tell "token doesn't exist" from "token expired" from
"registration mode rejects you." Reuse the existing `opaqueError` pattern in
`components/invite/invite-landing.tsx`.

### 3. Role rank — UI trims, backend enforces

`owner > admin > member` (lowercase, from `lib/org-roles.ts`).

- Backend enforces escalation with `Organizations.Role.EscalationForbidden`.
- UI **trims affordances** to `rolesBelow(callerRole)` strictly — never
  equal — so the user can't click their way into a guaranteed error.
- Last-owner protection: hide Leave / Remove / Demote on a row that is the
  only active owner. Backend enforces this with
  `Organizations.Owner.LastOwnerRequired`.

### 4. Permissions refresh, not version-polled

`MyOrganizationItem.permissions` carries a `permissionsVersion` hash. We
**do not poll this version**. Convention: after any mutation that could
change scope (`changeRole`, `acceptInvitation`, `removeMember`,
`createOrganization`, `deleteOrganization`), invalidate
`listMyOrganizationsQueryKey()` so the refetch picks up new permissions.

### 5. Erased members surface as nullable identity

`OrganizationMemberItem.userId` and `displayName` went **nullable** in the
May 2026 backend update. A null `userId` represents a GDPR-erased member
without addressable identity. Mutation endpoints require a `userId` path
segment, so those rows have no actionable affordances. `isAnonymized: true`
on the same row is the explicit signal — the UI collapses such rows to a
"Unknown user" tombstone (see `MemberCell`).

### 6. PATCH /organizations/{ref} requires both name and slug

The verb is PATCH but the body is full. The edit form prefills both from
the current org and always sends both — see `EditOrgForm`. A slug change
**has no automatic redirect** in v1; warn the user (`slugChangeWarning`)
and route to the new URL on success.

### 7. Delete is soft + idempotent

Repeating a delete on an already-soft-deleted org returns 204. There is no
undelete in v1 — the confirm requires retyping the slug as the irreversible
signal. Optimistically evict the row from `/my` before the round-trip so
the switcher and list stay in sync.

### 8. Invitation raw token shown exactly once

`POST .../invitations` returns `rawToken` once. The backend hashes it at
rest; the inviter must capture it from `<RawTokenPanel>` or rely on the
emailed copy. After the dialog closes, the value is unrecoverable — the
remedy is revoke + reissue.

The invitation URL pattern that the backend embeds:

```
${origin}/invite?token=<rawToken>&email=<inviteeEmail>
```

The manual "copy link" path must match this exactly so the experience is
identical to the auto-sent email.

### 9. Account deletion + sole ownership

`DELETE /v1/users/me` can be rejected with
`Organizations.Owner.UserErasureBlocked`. The problem payload carries a
`blockingOrganizations` extension (also accepted at the top level — see
`extractBlockingOrganizations`). The UI swaps the delete-confirm dialog for
a remediation panel that deep-links to each blocking org's members page
(transfer ownership) and settings page (delete org). **We do not auto-retry
the deletion** after remediation — the user must come back and reconfirm.

## Permission strings used here

Always import from `@/lib/org-permission-strings` so backend renames surface
as TypeScript errors, not silent guard failures.

| Constant            | Backend string                       |
| ------------------- | ------------------------------------ |
| `OrgRead`           | `organizations.organizations.read`   |
| `OrgWrite`          | `organizations.organizations.write`  |
| `OrgDelete`         | `organizations.organizations.delete` |
| `MembersRead`       | `organizations.members.read`         |
| `MembersManage`     | `organizations.members.manage`       |
| `InvitationsManage` | `organizations.invitations.manage`   |
| `AuditRead`         | `organizations.audit.read`           |

The namespace is `organizations.<resource>.<action>` — the outer
`organizations` is the module, the inner one is the resource (yes, the
repetition is intentional in the backend).

## Guard pattern

```tsx
// Subscribe — reactive when /my refreshes.
<Can permission={ORG_PERMISSION.MembersManage} inOrg={orgId}>
  …
</Can>;

// Or imperative, also subscribed.
const canManage = useHasOrgPermission(orgId, ORG_PERMISSION.MembersManage);
```

Do not call `hasOrgPermission(queryClient, ...)` directly during render —
it reads the cache without subscribing, so the component will not re-render
on `/my` refresh. The non-hook form is for event handlers and tests only.

See `lib/AGENTS.md` for the broader subscribe-vs-peek rule.

## When you change anything here

After meaningful changes in this folder, run the `permission-review` skill
to verify permission strings still match the backend, and the relevant
narrow checks per the root `AGENTS.md`. The PostToolUse glob hook will
remind you when permission-gated UI is touched.
