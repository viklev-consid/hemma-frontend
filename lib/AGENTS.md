# lib — pure helpers and project conventions

Functions in this folder are deliberately framework-thin. Most are pure and
unit-tested next to the implementation (`*.test.ts`). When you add a helper:

- Put it next to similar helpers in this folder, not in a feature folder,
  if more than one feature uses it.
- Add a test file. Vitest, jsdom, Jest-compatible API.
- Export constants and predicates separately so callers can branch on
  named constants instead of magic strings (see `lib/household-access-mode.ts`,
  `lib/household-errors.ts`, `lib/household-permission-strings.ts`).

## React Query — subscribe vs peek

This is the single most common footgun in this codebase. Rule:

> **If the returned value is consumed during render, the hook must subscribe
> via `useQuery`. `getQueryData` is for event handlers, effects, and tests
> only.**

`queryClient.getQueryData(key)` is a synchronous cache read. It does **not**
register the calling component as a subscriber. If the data changes (after
`invalidateQueries`, a mutation, or a refetch), components that read via
`getQueryData` will **not re-render** until something else nudges them.

### Right

```ts
// Hook used in render — subscribes; reacts to cache updates.
export function useHasHouseholdPermission(orgId, permission) {
  const { data } = useQuery({
    ...listMyHouseholdsOptions(),
    select: (response) =>
      response.households
        .find((o) => o.householdId === orgId)
        ?.permissions.includes(permission) ?? false,
  });
  return data ?? false;
}
```

### Wrong

```ts
// Reads cache during render — stale on the next refresh.
export function useHasHouseholdPermission(orgId, permission) {
  const qc = useQueryClient();
  return hasHouseholdPermission(qc, orgId, permission); // not subscribed
}
```

The non-hook `hasHouseholdPermission(client, ...)` form is fine — it just must be
called from event handlers, effects, or tests, never directly during render.

### `select` for projection

When subscribing to a large response just to read one boolean, pass `select`
to project. React Query memoizes by deep-equal on the selected value, so
unrelated changes to other fields won't re-render the consumer.

## Permission helpers

`household-permissions.ts` exposes both forms:

| Form                                | Use from                       |
| ----------------------------------- | ------------------------------ |
| `useHasHouseholdPermission(orgId, perm)`  | React render                   |
| `useMyHousehold(orgId)`          | React render                   |
| `hasHouseholdPermission(qc, orgId, perm)` | Event handlers, effects, tests |
| `findMyHousehold(qc, orgId)`     | Event handlers, effects, tests |

The `<Can inHousehold=...>` and `usePermission(perm, orgId)` wrappers in
`components/can.tsx` go through the subscribing form.

### Active-household checks and PlatformOverride

For UI that gates on a permission inside whichever household is currently
active — the global sidebar's contextual section is the canonical case
— use `useCanInActiveHousehold(perm)` from `lib/active-household-permissions.ts`
instead of `<Can inHousehold=...>`. The reason is platform admins:

A user acting under `accessMode: PlatformOverride` is **not in `/my`**.
`ActiveHouseholdProvider` synthesises a `MyHouseholdItem` for them so the
sidebar can still render, but its `permissions` array is empty by
design. A raw `<Can inHousehold={activeHousehold.id} permission={X}>` therefore
hides everything from an override admin even though the backend would
accept their actions.

`useCanInActiveHousehold` reads `HouseholdContext.accessMode` and grants override
admins through; for ScopedPermission users it falls back to the same
`useHasHouseholdPermission` lookup. The non-hook `hasHouseholdPermission(...)`
does NOT carry this behaviour — for event handlers that run for both
member and override admins, branch on `household.accessMode` explicitly.

## Constants vs magic strings

Every string the backend ships that the UI branches on lives as a named
constant here. Backend renames then surface as TypeScript errors at call
sites instead of silently broken guards. Current catalogs:

- `household-access-mode.ts` — `ACCESS_MODE`
- `household-errors.ts` — `HOUSEHOLD_ERRORS`
- `household-permission-strings.ts` — `HOUSEHOLD_PERMISSION`
- `household-roles.ts` — `HOUSEHOLD_ROLES`

When you add another module's contract here, mirror the pattern: a const
object with `as const`, a derived union type, and predicate helpers.

## Session, BFF, redirect-safety

- `session.ts` — iron-session config and the `PublicUser` shape that's safe
  to return to the client.
- `safe-next-path.ts` — validator for the `?next=` post-login redirect.
  Allows `/^/[^/\\]` paths only; blocks `/api/`, `/auth/`, and
  protocol-relative URLs. Any new redirect target accepted from user input
  must flow through this.
- `constants.ts` — `SESSION_COOKIE_NAME` and other harness constants.

## Date formatting

Dates from the backend come as ISO strings. Render with
`new Date(value).toLocaleDateString()` for now. Heads-up:
`react-doctor/rendering-hydration-mismatch-time` flags these because server
locale may differ from client locale. The eventual remedy is a client-only
`<RelativeTime>` component; until then the warning is acceptable.
