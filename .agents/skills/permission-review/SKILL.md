---
name: permission-review
description: |
  Audit permission strings and guard placement in UI code. Catches typos, stale strings, duplicated checks, and missing scope (e.g. `inOrg=` omitted on a per-org check).
  TRIGGER when an edit touches: `components/can.tsx`; any file containing `<Can`, `usePermission(`, `useHasOrgPermission(`, or `hasOrgPermission(`; `lib/org-permissions.ts`, `lib/org-permission-strings.ts`, `lib/org-roles.ts`; anything under `components/organizations/` or `app/(app)/app/organizations/`; or when the user asks to "audit permissions", "check permission strings", or "verify guards".
  SKIP when changes are styling-only, copy-only, or limited to generated files under `api/generated/`.
version: "1.1.0"
---

# Permission-Aware Component Reviewer

Validates that permission strings used in UI components are correct and consistent with the backend API contract.

## When to use

Run this review after creating or modifying any component that:

- Uses `<Can permission="...">` or `<Can anyOf={[...]} inOrg={orgId}>`
- Calls `usePermission("...")` or `usePermission("...", orgId)`
- Calls `useHasOrgPermission(orgId, "...")` or the imperative `hasOrgPermission(qc, orgId, "...")`
- Accesses `permissions` from `useAuth()` (global / platform checks)

## Review steps

### 1. Collect all permission strings used in the codebase

```bash
grep -rn 'permission=' --include="*.tsx" --include="*.ts" app/ components/ | grep -v node_modules | grep -v api/generated
grep -rn 'usePermission(\|useHasOrgPermission(\|hasOrgPermission(\|hasPermission(' --include="*.tsx" --include="*.ts" app/ components/ lib/ | grep -v node_modules | grep -v api/generated
grep -rn 'ORG_PERMISSION\.' --include="*.tsx" --include="*.ts" app/ components/ lib/ | grep -v node_modules | grep -v api/generated
```

### 2. Cross-reference against the backend API

Check the OpenAPI spec and generated types for known permission patterns:

```bash
grep -rn 'permission' api/generated/sdk.gen.ts | grep -i "requires\|permission"
```

The backend uses dotted permission strings (e.g., `"users.users.read"`, `"audit.trail.read"`). Verify every permission string in UI code:

- [ ] Follows the dotted notation pattern: `<module>.<resource>.<action>`
- [ ] Is referenced in the backend API documentation (sdk.gen.ts comments)
- [ ] Has no typos (check each segment against known modules/resources/actions)
- [ ] Is used consistently (same permission string isn't written differently in different files)

### 3. Check component patterns

- [ ] `<Can>` is used for UI gating, not for data fetching decisions
- [ ] Permission checks happen at the right granularity (page-level vs element-level)
- [ ] Fallback content is appropriate (don't show broken UI when permission is denied)
- [ ] No permission checks are duplicated — if a parent gates on a permission, children don't re-check

### 4. Report format

```
## Permission Audit

### Strings found
| Permission string        | Files using it                     | Valid? |
|-------------------------|------------------------------------|--------|
| audit.trail.read        | app/(app)/page.tsx:27              | YES    |
| users.users.read        | app/(app)/admin/users/page.tsx:12  | YES    |
| audit.trail.raed        | components/sidebar.tsx:45          | TYPO   |

### Issues
- **TYPO**: `audit.trail.raed` in sidebar.tsx:45 — should be `audit.trail.read`
- **UNKNOWN**: `foo.bar.baz` in settings.tsx:12 — not found in backend API docs
```
