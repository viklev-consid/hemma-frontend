# Property — Household Frontend Implementation Plan

> Master plan for the frontend representation of the backend **Property** module
> (`/v1/property`). Mirrors the structure and conventions of the Economy module
> (`economy-household-frontend-plan.md` + `docs/workflows/phase-*.md`).
>
> **Audience:** the implementing agent. Every phase below is meant to be buildable
> with no open question marks. Read the "Global rules" section first — it is
> assumed by every phase.

---

## 0. Context & ground truth

The backend shipped a household-scoped Property surface. The OpenAPI spec was
synced (`pnpm api:sync`) and the client regenerated (`pnpm api:generate`). All
31 endpoints, their types, zod schemas, and React Query hooks are already present
in `api/generated/` — **do not hand-edit generated files.**

The feature has three areas:

1. **Projects** — renovation/improvement projects with tasks, links, attachments,
   a status lifecycle, and an Economy-linked budget snapshot.
2. **Maintenance** — recurring maintenance plans that materialize dated
   occurrences; occurrences can be completed, skipped, or promoted to a project.
3. **Logbook (History)** — a dated record of completed work, optionally seeded
   from project completion / maintenance completion ("suggested history entry"),
   with photos.

### Decisions already made (do not re-litigate)

| Decision              | Choice                                                                                            | Rationale                                                                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Permission gating** | Gate on real strings `property.data.read` / `property.data.write` via `useHasHouseholdPermission` | Backend **confirmed** these are returned per household in `/v1/households/my`. In v1 both owners and members receive both grants, so it's functionally membership-equal today but future-proof and matches the `constants-vs-magic-strings` convention. |
| **Task reorder UX**   | Up / Down buttons (no DnD library)                                                                | Respects `docs/tech-choices.md`; no new dependency; accessible. Sends the **complete** task-id set.                                                                                                                                                     |
| **Scope**             | Full feature set, phased (Phases 1–6)                                                             | Build all three areas sequentially.                                                                                                                                                                                                                     |

---

## 1. Global rules (apply to every phase)

### 1.1 Routing & shell

- Property lives under the household shell, parallel to Economy:
  **`app/(app)/app/h/[slug]/property/`**.
- The `[slug]` is the household **slug**, never the GUID. The shell layout at
  `app/(app)/app/h/[slug]/layout.tsx` already prefetches `listMyHouseholdsOptions()`
  and `getHouseholdOptions()` and mounts `HouseholdProvider`, so inside Property
  components `useHousehold()` returns `{ householdId, slug, name, role, accessMode }`.
- New `property/layout.tsx` is a **server component** that:
  1. `const { slug } = await params;`
  2. `const householdId = await resolveHouseholdId(slug);` (reuse
     `lib/economy/resolve-household-id.ts` — it is generic, not economy-specific;
     **do not** copy it, import it).
  3. Prefetch the route-critical first-paint query with
     `client: serverClient, query: { householdId }`, wrapped in `.catch(() => undefined)`.
  4. Return `<HydrationBoundary state={dehydrate(queryClient)}><PropertyShell slug={slug}>{children}</PropertyShell></HydrationBoundary>`.
- Use `createQueryClient()` from `lib/query-client.ts` in the server layout.

### 1.2 Household scoping (CRITICAL — every endpoint)

Every Property endpoint is household-scoped. The generated client splits where
`householdId` goes per operation — **follow the generated signature exactly**:

- **Reads (GET)**: `householdId` is a **query** param → `query: { householdId, ...filters }`.
- **Mutations with a JSON body** (create/update/status/complete/skip/promote/
  add-task/add-link/reorder): `householdId` is a field **inside the body** →
  `body: { householdId, ... }`.
- **Deletes & deactivate**: `householdId` is a **query** param →
  `path: { ... }, query: { householdId }`.
- **Attachment upload** (`addPropertyProjectAttachment`): `householdId` is a
  **query** param, the file is the multipart body →
  `path: { projectId }, query: { householdId }, body: { file }`.
  (This differs from Economy receipts, where householdId was in the body. Match
  the generated `AddPropertyProjectAttachmentData` type.)

Get `householdId` from `useHousehold()` in client components. Never read it from
the URL or hard-code it.

### 1.3 Permissions

Backend **confirmed**: `/v1/households/my` returns `property.data.read` and
`property.data.write` in each household item's `permissions` array (v1: every
member gets both). Gate on the real strings — same model as Economy
(`economy.data.read/write`).

- Add `PROPERTY_PERMISSION` to the shared `lib/household-permission-strings.ts`
  alongside `HOUSEHOLD_PERMISSION`:
  ```ts
  export const PROPERTY_PERMISSION = {
    Read: "property.data.read",
    Write: "property.data.write",
  } as const;
  ```
- Read views: gate on `useHasHouseholdPermission(householdId, PROPERTY_PERMISSION.Read)`.
  Write affordances (create/edit/delete/status/complete/skip/promote/upload):
  gate on `PROPERTY_PERMISSION.Write`. Use the subscribing hook in render; the
  non-hook `hasHouseholdPermission(qc, ...)` in event handlers (per `lib/AGENTS.md`).
- For sidebar / cross-app gates that must also pass `PlatformOverride` admins,
  use `useCanInActiveHousehold(PROPERTY_PERMISSION.Read)` (see
  `lib/active-household-permissions.ts`) rather than a raw `<Can inHousehold=...>`.
- A thin `lib/property/use-can-write-property.ts` wrapping
  `useHasHouseholdPermission(householdId, PROPERTY_PERMISSION.Write)` is optional
  sugar — keep all write buttons going through one helper so a future
  owner-only split is a one-file change. Do **not** sprinkle raw strings in
  components.

### 1.4 Enums — use the generated types (now IN the spec)

Backend **fixed** this: the enums are now first-class OpenAPI schemas, so codegen
emits literal-union types in `api/generated/types.gen.ts` and `z.enum`s in
`api/generated/zod.gen.ts`. **Use these directly — do not hand-roll string
constants.** Confirmed generated identifiers:

| Concept           | Type (types.gen.ts)           | Zod (zod.gen.ts)               | Values                              |
| ----------------- | ----------------------------- | ------------------------------ | ----------------------------------- |
| Project status    | `ProjectStatus`               | `zProjectStatus`               | `Planning` `Active` `OnHold` `Done` |
| Task status       | `ProjectTaskStatus`           | `zProjectTaskStatus`           | `Todo` `Doing` `Done`               |
| Recurrence unit   | `MaintenanceRecurrenceUnit`   | `zMaintenanceRecurrenceUnit`   | `Month` `Year`                      |
| Occurrence status | `MaintenanceOccurrenceStatus` | `zMaintenanceOccurrenceStatus` | `Upcoming` `Done` `Skipped`         |
| History type      | `HistoryEntryType`            | `zHistoryEntryType`            | `Project` `Maintenance` `Manual`    |

The relevant request/response fields now reference these (so `ProjectRequest.status`
is typed `ProjectStatus`, etc.), and the list query params are typed too
(`GET /v1/property/projects?status=`, `GET /v1/property/history?type=`).

`lib/property/enums.ts` is still useful but **only** for presentation glue, not
truth: an **ordered array** per enum for select options (the union type doesn't
imply order) and a **label map** keyed to i18n message ids. Derive the arrays
from the generated `z*.enum` `.options` / `.enum` where convenient so a backend
value addition surfaces as a TS error. Selects must only offer generated enum
values — the backend returns **422** on anything else.

### 1.5 Money

- Reuse the Economy money utilities — they are generic over `MoneyDto`-shaped
  objects (`{ amount, currency }`):
  - Display: `formatMoney(money)` and the `<Money value={...} />` component.
  - Input: `<MoneyInput />` + `toMoneyRequest(amount)` / `isValidMoneyAmount`.
- `MoneyDto.amount` is `number | string`; never do arithmetic in the browser —
  the backend computes budget totals (`GetProjectBudgetResponse` already returns
  `linkedTotal` / `remaining`).
- Default currency is `SEK` via `ECONOMY_CURRENCY`. If Property should not depend
  on `lib/economy/*`, copy these two tiny modules into `lib/property/money.ts`
  and `components/property/money.tsx` instead — **decide once and be consistent**
  (recommended: import from economy to avoid drift; flag in the PR if that
  coupling is unwanted).

### 1.6 Dates (DateOnly vs DateTimeOffset)

- `targetStartDate`, `targetEndDate`, `dueDate`, `anchorDate`, history `date`,
  task `dueDate` are **DateOnly** → send/expect `"YYYY-MM-DD"` strings (no time,
  no timezone). Use a plain `<input type="date">` (its value is already
  `YYYY-MM-DD`) or `react-day-picker` formatting to `yyyy-MM-dd` with
  `date-fns/format`. **Never** call `toISOString()` (it adds time + shifts TZ).
- `completedAt` is a **DateTimeOffset** → full ISO timestamp string, read-only in
  the UI (display only; backend stamps it).
- Display dates with a fixed locale (`"sv-SE"`) to avoid hydration mismatch —
  follow the Economy `ECONOMY_LOCALE` precedent. Add `lib/property/dates.ts` with
  `formatDateOnly(value)` and `toDateOnly(date)` helpers.

### 1.7 Forms

- TanStack Forms + generated zod schemas + generated mutation hooks + the
  ProblemDetails mapper (`api/problems.ts`). Never write per-form error handling.
- Validate fields with the generated `z*Request` schemas (e.g.
  `zProjectRequest`, `zMaintenancePlanRequest`, `zHistoryEntryRequest`). These now
  **do** enforce enum membership (the schemas reference `zProjectStatus` etc.), so
  invalid enum strings fail client-side. Still drive select options from the
  ordered arrays in `lib/property/enums.ts` so the UI only ever offers valid values.
- Map **400 (validation)** → field errors; **409/404/422** → toast; **401** →
  handled globally. The mapper already does this; just wire `onError`.

### 1.8 Mutations & cache invalidation

- On success, `queryClient.invalidateQueries()` for every affected list/detail key.
  Concretely:
  - Project create/update/delete/status → invalidate `listPropertyProjectsQueryKey({ query: { householdId } })` and, for update/status, `getPropertyProjectQueryKey({ path: { projectId }, query: { householdId } })`.
  - Task add/update/delete/reorder → invalidate `getPropertyProjectQueryKey(...)` (tasks are nested in the full project) **and** `getPropertyProjectTasksQueryKey(...)`.
  - Link/attachment add/remove → invalidate `getPropertyProjectQueryKey(...)`.
  - Status → Done → also surface `suggestedHistoryEntry` (see §1.9); invalidate budget key.
  - Plan create/update/delete/deactivate → `listPropertyMaintenancePlansQueryKey({ query: { householdId } })` and `getPropertyMaintenancePlanQueryKey(...)`.
  - Occurrence complete/skip/promote → `listPropertyUpcomingMaintenanceOccurrencesQueryKey({ query: { householdId } })`; promote also invalidates `listPropertyProjectsQueryKey(...)`.
  - History create/update/delete → `listPropertyHistoryQueryKey({ query: { householdId } })`.
- Reorder requires the **complete** task-id set (subset → 400). Always send all ids.

### 1.9 Suggested history entries (draft, not persisted)

- `changePropertyProjectStatus` → `Done`, and `completePropertyMaintenanceOccurrence`,
  return a `suggestedHistoryEntry` (`SuggestedHistoryEntryResponse`). This is a
  **draft only** — nothing is saved server-side.
- UX: after the mutation succeeds, if `suggestedHistoryEntry != null`, show a
  non-blocking prompt ("Add this to your logbook?") that opens the history-create
  form **pre-filled** from the suggestion (date, title, area, cost, type,
  `sourceProjectId` / `sourceMaintenanceOccurrenceId`, and `photoRefs` →
  `HistoryPhotoRefRequest[]`). The user confirms to actually `createPropertyHistoryEntry`.
- Do not auto-create. Dismissing the prompt simply drops the draft.

### 1.10 Attachments & photos (no public URLs)

- Responses never include public URLs. Content is fetched through protected
  endpoints that ride the BFF proxy (cookie-authenticated):
  - Project attachment: `GET /v1/property/projects/{projectId}/attachments/{attachmentId}/content?householdId=...`
  - History photo: `GET /v1/property/history/{historyEntryId}/photos/{blobKey}/content?householdId=...`
- The proxy at `app/api/proxy/[...path]/route.ts` forwards the session cookie and
  streams the response, so an `<img>`/download link can point **directly at the
  proxy path**:
  `/api/proxy/v1/property/projects/${projectId}/attachments/${attachmentId}/content?householdId=${householdId}`.
  No need to blob-fetch in JS for display. (Confirm content-type is forwarded —
  the proxy already lists `content-type` in forwarded headers.)
- Upload constraints to enforce client-side **before** mutate (mirror
  `lib/economy/receipt.ts` → create `lib/property/attachment.ts`):
  - Allowed types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
  - Max size: **10 MB**.
  - On violation, show a toast and abort; the backend returns 422 otherwise.
- Logbook photos are created from existing blob refs (`HistoryPhotoRefRequest`
  = `{ container, key }`), typically copied from a suggested history entry's
  `photoRefs`. The backend copies the blob, so deleting the source project
  attachment does not break the history photo. History **update** does NOT accept
  `photoRefs` — photos are attach-on-create only.

### 1.11 Field limits (enforce in UI + zod)

| Field                                   | Max  |
| --------------------------------------- | ---- |
| Project / plan / history **title/name** | ~160 |
| **area**                                | 100  |
| **description**                         | 2000 |
| project **notes**                       | 4000 |
| occurrence **notes**                    | 2000 |

The generated `z*Request` schemas should already encode these (verify); add
`maxLength` to inputs and show counts where helpful.

### 1.12 i18n

- Create `messages/en/property.json` and register it in `messages/en/index.ts`
  (import + add to the `messages` object, alphabetical-ish like the others).
- Namespace mirrors economy: `property.shell.nav.*`, `property.projects.*`,
  `property.maintenance.*`, `property.logbook.*`, plus enum label maps
  (`property.enums.projectStatus.Planning`, etc.).
- Add `app.shell.orgProperty` (or reuse the existing nav label scheme) for the
  sidebar entry — see §1.13.

### 1.13 Sidebar navigation

- Edit `components/app-shell/household-nav.tsx`. Add a `PROPERTY_NAV_ITEMS` array
  and a second collapsible `<SidebarMenuItem>` modeled exactly on the Economy
  block (icon from `lucide-react` — e.g. `HouseIcon` / `WrenchIcon`, a
  `propertyOpen` state, `isPropertyRoute` derived from `pathname`).
- Sub-items (Phase order): `projects`, `maintenance`, `logbook`.

### 1.14 Verification per phase (from AGENTS.md)

After each phase: `pnpm typecheck` && `pnpm lint`; `pnpm test --run` if tests
touch the area; `npx -y react-doctor@latest . --verbose --diff` for UI changes
(no score regression); `pnpm build` when layouts/routes change. The
`permission-review` skill applies because permission-gated UI changes.

### 1.15 Do NOT build (out of scope)

- Server actions for mutations (keep client-side).
- Any direct `fetch` to the .NET backend (always the generated client +
  `serverClient` for prefetch).
- A currency picker (SEK only).
- Pagination controls (backend has none yet for projects/history — render full
  lists; add a note if lists grow).
- Calendar/Gantt visualizations beyond a simple chronological occurrence list
  (can come later; horizon is configurable but default 30 days).

---

## 2. Endpoint → hook reference (for the implementing agent)

All identifiers below are **exact** generated exports from
`api/generated/@tanstack/react-query.gen.ts` and `api/generated/zod.gen.ts`.

### Projects

| Operation                               | Read/Write | Hook export                                                            | Zod body                                     |
| --------------------------------------- | ---------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| List projects (`status`,`area` filters) | R          | `listPropertyProjectsOptions` / `listPropertyProjectsQueryKey`         | `zListPropertyProjectsQuery`                 |
| Get project (full, nested)              | R          | `getPropertyProjectOptions` / `getPropertyProjectQueryKey`             | —                                            |
| Get budget snapshot                     | R          | `getPropertyProjectBudgetOptions` / `getPropertyProjectBudgetQueryKey` | —                                            |
| Get tasks                               | R          | `getPropertyProjectTasksOptions` / `getPropertyProjectTasksQueryKey`   | —                                            |
| Create project                          | W          | `createPropertyProjectMutation`                                        | `zProjectRequest`                            |
| Update project                          | W          | `updatePropertyProjectMutation`                                        | `zProjectRequest`                            |
| Delete project                          | W          | `deletePropertyProjectMutation`                                        | —                                            |
| Change status                           | W          | `changePropertyProjectStatusMutation`                                  | `zChangeProjectStatusRequest`                |
| Add task                                | W          | `addPropertyProjectTaskMutation`                                       | `zProjectTaskRequest`                        |
| Update task                             | W          | `updatePropertyProjectTaskMutation`                                    | `zProjectTaskRequest`                        |
| Delete task                             | W          | `deletePropertyProjectTaskMutation`                                    | —                                            |
| Reorder tasks (full id set!)            | W          | `reorderPropertyProjectTasksMutation`                                  | `zReorderTasksRequest`                       |
| Add link                                | W          | `addPropertyProjectLinkMutation`                                       | `zProjectLinkRequest`                        |
| Remove link                             | W          | `removePropertyProjectLinkMutation`                                    | —                                            |
| Add attachment (multipart `file`)       | W          | `addPropertyProjectAttachmentMutation`                                 | `zAddPropertyProjectAttachmentBody` (`file`) |
| Attachment content                      | R          | `getPropertyProjectAttachmentContentOptions` (or direct proxy `<img>`) | —                                            |
| Remove attachment                       | W          | `removePropertyProjectAttachmentMutation`                              | —                                            |

### Maintenance

| Operation                                             | R/W | Hook export                                                         | Zod body                                           |
| ----------------------------------------------------- | --- | ------------------------------------------------------------------- | -------------------------------------------------- |
| List plans (`activeOnly`)                             | R   | `listPropertyMaintenancePlansOptions` / `...QueryKey`               | `zListPropertyMaintenancePlansQuery`               |
| Get plan (+ `nextOccurrence`)                         | R   | `getPropertyMaintenancePlanOptions` / `...QueryKey`                 | —                                                  |
| Create plan (→ materializes first occurrence)         | W   | `createPropertyMaintenancePlanMutation`                             | `zMaintenancePlanRequest`                          |
| Update plan                                           | W   | `updatePropertyMaintenancePlanMutation`                             | `zMaintenancePlanRequest`                          |
| Delete plan                                           | W   | `deletePropertyMaintenancePlanMutation`                             | —                                                  |
| Deactivate plan                                       | W   | `deactivatePropertyMaintenancePlanMutation`                         | —                                                  |
| List upcoming occurrences (`horizonDays`, default 30) | R   | `listPropertyUpcomingMaintenanceOccurrencesOptions` / `...QueryKey` | `zListPropertyUpcomingMaintenanceOccurrencesQuery` |
| Complete occurrence (→ suggestedHistory + next)       | W   | `completePropertyMaintenanceOccurrenceMutation`                     | `zCompleteOccurrenceRequest`                       |
| Skip occurrence (→ next)                              | W   | `skipPropertyMaintenanceOccurrenceMutation`                         | `zSkipOccurrenceRequest`                           |
| Promote occurrence → project (201)                    | W   | `promotePropertyMaintenanceOccurrenceMutation`                      | `zPromoteOccurrenceRequest`                        |

### Logbook / History

| Operation                            | R/W | Hook export                                                       | Zod body                    |
| ------------------------------------ | --- | ----------------------------------------------------------------- | --------------------------- |
| List history (`year`,`area`,`type`)  | R   | `listPropertyHistoryOptions` / `listPropertyHistoryQueryKey`      | `zListPropertyHistoryQuery` |
| Create entry (photos on create only) | W   | `createPropertyHistoryEntryMutation`                              | `zHistoryEntryRequest`      |
| Update entry (no `photoRefs`)        | W   | `updatePropertyHistoryEntryMutation`                              | `zHistoryEntryRequest`      |
| Delete entry                         | W   | `deletePropertyHistoryEntryMutation`                              | —                           |
| Photo content                        | R   | `getPropertyHistoryPhotoContentOptions` (or direct proxy `<img>`) | —                           |

**History type ↔ source-id rules (enforce in the form):**

- `Manual` → must send **no** source ids.
- `Project` → may set `sourceProjectId`, must **not** set `sourceMaintenanceOccurrenceId`.
- `Maintenance` → may set `sourceMaintenanceOccurrenceId`, must **not** set `sourceProjectId`.

---

## 3. Phases

Each phase is independently shippable and verifiable. Build in order.

### Phase 0 — Spec-sync fallout: MoneyDto migration ✅ DONE

**Goal:** restore a green `pnpm typecheck` after the spec sync.

The Property spec re-emit consolidated `MoneyRequest` + `MoneyResponse` into a
single shared `MoneyDto` (`{ amount: string; currency: Currency }`) — the old
names no longer exist. The backend confirmed this is intentional (`MoneyDto` is
now the one shared wire DTO for Economy and Property; `amount` is a decimal
string). The transient `number | string` widening was a spec-transformer
regression and is now fixed (`amount: string`).

**Applied** in this branch: renamed the type references `MoneyResponse` /
`MoneyRequest` → `MoneyDto` in `lib/economy/money.ts`,
`components/economy/money.tsx`, `lib/economy/analytics.ts`. No coercion needed
(amount is `string` again). `pnpm typecheck` is **clean**; economy money +
analytics tests pass (19). Could ship as a standalone chore
("chore(api): migrate to MoneyDto after spec sync") or fold into the Property
branch.

### Phase 1 — Shell, scaffolding & shared utilities

**Goal:** the Property section exists, is navigable, scoped, and has the shared
building blocks every later phase needs.

**Workstreams**

- **WS1.1 Routing/shell**: `app/(app)/app/h/[slug]/property/layout.tsx`
  (server prefetch of `listPropertyProjectsOptions` for first paint),
  `page.tsx` (redirect to `./projects`), and `components/property/property-shell.tsx`
  (mirrors `economy-shell.tsx`).
- **WS1.2 Shared libs**: `lib/property/enums.ts` (§1.4), `lib/property/dates.ts`
  (§1.6), `lib/property/attachment.ts` (§1.10), `lib/property/use-can-write-property.ts`
  (§1.3), money decision per §1.5. Add `PROPERTY_PERMISSION` to
  `lib/household-permission-strings.ts`.
- **WS1.3 i18n**: `messages/en/property.json` + register in `index.ts`; add
  sidebar label key.
- **WS1.4 Sidebar**: extend `components/app-shell/household-nav.tsx` (§1.13).
- **WS1.5 Skeletons**: `components/property/property-skeletons.tsx`.

**Acceptance**

- `/app/h/<slug>/property` renders inside the household shell and redirects to
  `/projects`; sidebar shows a collapsible Property group with three sub-items.
- `pnpm build` passes (new routes). `pnpm typecheck`/`lint` clean.
- No data yet beyond an empty projects list placeholder.

---

### Phase 2 — Projects: list + detail (read) + create/edit/delete

**Goal:** full project CRUD minus the nested collections.

**Surfaces**

- `property/projects/page.tsx` — list (prefetched). Filters: `status` (enum
  select) + `area` (text), via `nuqs` URL state (mirror Economy filter parsers).
  Each row: name, status badge, area, target dates, `budgetEstimate` via `<Money>`.
  Empty state + "New project" (write-gated).
- `property/projects/new/page.tsx` — create form (`zProjectRequest`).
- `property/projects/[projectId]/page.tsx` — detail (prefetch
  `getPropertyProjectOptions`). Header (name/status/area/dates/budget), notes,
  and **placeholders** for tasks/links/attachments (filled in Phase 3). Edit +
  Delete (write-gated; delete confirms via dialog).

**Details**

- Status badge component keyed off `ProjectStatus` with color variants.
- Date inputs per §1.6; money via `<MoneyInput>`.
- Invalidation per §1.8.

**Acceptance**

- Create → appears in list; edit persists; delete removes (with confirm).
- 422/409 surface as toasts; 400 maps to field errors.
- Filters reflect in URL and refetch.

---

### Phase 3 — Project tasks, links & attachments

**Goal:** the nested collections on the project detail page.

**Surfaces (all on `projects/[projectId]`)**

- **Tasks**: list ordered by `sortOrder`; add/edit/delete; status select
  (`ProjectTaskStatus`); optional `estimate` (`<MoneyInput>`), `assigneeId`,
  `dueDate`. **`assigneeId` is a household-member user id** — populate the picker
  from `GET /v1/households/{householdRef}/members` (use the generated members
  query hook; pass the slug as `householdRef`). Use `member.userId` as the value;
  skip/disable rows where `userId` is null or the member is anonymized.
  **Reorder** via Up/Down buttons → `reorderPropertyProjectTasksMutation` with the
  **complete** id array in new order.
- **Links**: list (label + url, opens in new tab `rel="noopener"`); add/remove.
  Validate URL (zod already does; show field error on 422).
- **Attachments**: upload (`<input type="file">`, validate via
  `lib/property/attachment.ts` before mutate; `query: { householdId }`,
  `body: { file }`); list (fileName, contentType, size); view/download via direct
  proxy URL (§1.10); remove (write-gated, confirm).

**Acceptance**

- Reorder sends all ids; sending a subset is impossible from the UI.
- Disallowed file type/size blocked client-side with a toast (no network call).
- Uploaded image renders from the proxy content URL; PDF opens/downloads.

---

### Phase 4 — Project status lifecycle & budget

**Goal:** status transitions + Economy-linked budget snapshot + suggested history.

**Surfaces**

- Status control on project detail: transitions across
  `Planning → Active → OnHold → Done` via `changePropertyProjectStatusMutation`.
- On → `Done`: handle `ChangeProjectStatusResponse.suggestedHistoryEntry` per
  §1.9 (open pre-filled logbook-create — depends on Phase 6 form; if Phase 6 not
  yet built, store the draft and show the prompt as a no-op TODO, OR sequence
  Phase 6 before this — **recommended: build Phase 6 before wiring the suggestion
  prompt**, or land the prompt in Phase 6).
- Budget panel: `getPropertyProjectBudgetOptions` → show `estimate`,
  `linkedTotal`, `remaining` (all `<Money>`), and `transactionCount`. All values
  come from the backend — no client math. The Property budget endpoint is
  **read-only aggregation**.

**Linking spend (Economy-side, confirmed).** Projects are linked to spend by
tagging **Economy transactions** with a project id — not through any Property
endpoint:
`POST /v1/economy/transactions/{transactionId}/project`, body
`{ householdId, projectId }` (set `projectId` to a UUID to link, `null` to
unlink). Any "link this transaction to a project" affordance therefore belongs in
the **Economy transaction UI**, not here. For Property v1 the budget panel is
display-only; a project→transactions linking surface is optional and, if built,
lives on the Economy side (flag as a follow-up; out of scope for these phases).

**Acceptance**

- Status change persists and re-renders badge; budget panel reflects values.
- Completing a project surfaces the suggested-history prompt (wired with Phase 6).

---

### Phase 5 — Maintenance: plans + occurrences

**Goal:** recurring maintenance plans and their occurrence roadmap.

**Surfaces**

- `property/maintenance/page.tsx` — two regions:
  - **Plans** list (`listPropertyMaintenancePlansOptions`, `activeOnly` toggle):
    title, area, recurrence (`recurrenceInterval` + `recurrenceUnit` →
    "every 6 Month(s)"), `anchorDate`, `leadTimeDays`, `isActive` badge.
    Create/edit (`zMaintenancePlanRequest`), delete, **deactivate** (write-gated).
  - **Upcoming occurrences** (`listPropertyUpcomingMaintenanceOccurrencesOptions`,
    `horizonDays` control, default 30): chronological list grouped by due date;
    each shows planTitle, area, dueDate, status badge (`MaintenanceOccurrenceStatus`).
- Occurrence actions (write-gated):
  - **Complete** (`completePropertyMaintenanceOccurrenceMutation`, optional
    `notes` ≤2000) → handle `suggestedHistoryEntry` (§1.9) + show `nextOccurrence`.
  - **Skip** (`skipPropertyMaintenanceOccurrenceMutation`, optional notes) →
    show `nextOccurrence`.
  - **Promote** (`promotePropertyMaintenanceOccurrenceMutation`,
    `zPromoteOccurrenceRequest`) → creates a project (201), marks occurrence
    `Done`; on success navigate to the new project detail. Invalidate projects +
    occurrences lists.
- Plan detail (optional sub-route) showing `nextOccurrence`.

**Notes**

- Creating a plan materializes the first occurrence — invalidate the occurrences
  list after create.
- Complete/skip schedule the next occurrence unless the plan was deactivated.

**Acceptance**

- Create plan → first occurrence appears in upcoming list.
- Complete/skip advances to the next occurrence; promote lands on a new project.
- Suggested history from completion flows into the logbook prompt.

---

### Phase 6 — Logbook (History)

**Goal:** the household's record of completed work, plus the suggested-entry
intake used by Phases 4 & 5.

**Surfaces**

- `property/logbook/page.tsx` — list (`listPropertyHistoryOptions`) with filters
  `year` (number/select), `area` (text), `type` (`HistoryEntryType` select), via
  `nuqs`. Each entry: date, title, area, cost (`<Money>`), type badge, photo
  thumbnails (proxy content URLs, §1.10), and source link (to project /
  occurrence when `sourceProjectId` / `sourceMaintenanceOccurrenceId` present).
- Create form (`zHistoryEntryRequest`) — **reusable**, accepts an optional
  `initialValues` (the suggested-entry draft from §1.9). Enforces the
  type↔source-id rules (§2). Photos: on **create** only, via
  `photoRefs: HistoryPhotoRefRequest[]` (from a suggestion's `photoRefs`, or — if
  a standalone photo-attach flow is needed — see Open Items; for v1, photos only
  flow in from suggestions).
- Edit form — same fields **minus** `photoRefs` (update doesn't accept them);
  keep existing photos read-only.
- Delete (write-gated, confirm).

**Wire-up**

- Export the create form so Phase 4/5 suggestion prompts open it pre-filled.
- `Manual` entries: hide/clear source-id fields.

**Acceptance**

- Create/edit/delete work; filters reflect in URL.
- A suggested entry from completing a project or occurrence opens this form
  pre-filled and, on confirm, persists with photos copied.
- Type/source-id invariants are enforced before submit.

---

## 4. Open items — RESOLVED (backender reply, 2026-06-11)

All blocking unknowns were landed with the backender. Recorded here so the
implementing agent has the answers inline; none remain open for v1.

0. **MoneyDto consolidation — RESOLVED & DONE.** Intentional: `MoneyDto`
   (`{ amount: string; currency: "SEK" }`) is the single shared wire DTO for
   Economy + Property; `amount` is a decimal string. The `number | string`
   widening was a transformer regression, now fixed. Phase 0 migration applied;
   tree is green. ✅

1. **Permissions — RESOLVED.** `/v1/households/my` returns `property.data.read`
   and `property.data.write` per household item. v1: owners **and** members get
   both (no owner-only behavior). Naming mirrors Economy
   (`economy.data.read/write`). → Gate on the real strings (§1.3).

2. **Project ↔ Economy budget linking — RESOLVED.** Property budget is read-only
   aggregation. The link is created on the **Economy** side:
   `POST /v1/economy/transactions/{transactionId}/project`, body
   `{ householdId, projectId }` (UUID to link, `null` to unlink). No Property
   linking endpoint. Budget panel is display-only; any linking affordance is an
   Economy-side follow-up (§ Phase 4).

3. **Task `assigneeId` — RESOLVED.** It's a household-member user id. Populate
   pickers from `GET /v1/households/{householdRef}/members`; use `member.userId`;
   ignore/disable anonymized members or null `userId` (§ Phase 3).

4. **Logbook photos — RESOLVED.** `CreateHistoryEntry` accepts `photoRefs`, but
   the refs must already exist (copy-from-existing-blob-ref, typically from a
   suggested project history entry / project attachment). There is **no**
   standalone "upload manual logbook photo" endpoint, and `update` intentionally
   doesn't accept `photoRefs` (photo changes are create-time only). → v1: photos
   flow only from suggestions; manual entries are text-only (§ Phase 6).

5. **Enums — RESOLVED & DONE.** Now exposed as OpenAPI enum schemas; codegen
   emits literal unions + `z.enum`s. Use the generated types
   (`ProjectStatus`, `ProjectTaskStatus`, `MaintenanceRecurrenceUnit`,
   `MaintenanceOccurrenceStatus`, `HistoryEntryType`) directly (§1.4). List query
   params (`?status=`, `?type=`) are typed too. ✅

6. **Money/locale ownership — assumption (confirm in PR, non-blocking).**
   Property reuses Economy's SEK + `sv-SE` helpers. `MoneyDto.currency` is the
   `Currency` enum (`"SEK"` only), consistent with this. Decide in review whether
   to import from `lib/economy/*` (recommended — avoids drift) or duplicate under
   `lib/property/*` (§1.5).

---

## 5. Cross-cutting file manifest (what gets created)

```
lib/property/enums.ts                          (§1.4 — ordered arrays + i18n label maps only; types come from generated)
lib/property/dates.ts                          (§1.6)
lib/property/attachment.ts                     (§1.10)
lib/property/use-can-write-property.ts         (§1.3 — wraps useHasHouseholdPermission(.., PROPERTY_PERMISSION.Write))
lib/property/money.ts                          (only if not reusing economy; §1.5)
lib/household-permission-strings.ts            (EDIT: add PROPERTY_PERMISSION)
messages/en/property.json + index.ts           (EDIT register)
components/app-shell/household-nav.tsx          (EDIT: add Property group)

app/(app)/app/h/[slug]/property/layout.tsx
app/(app)/app/h/[slug]/property/page.tsx        (redirect → projects)
app/(app)/app/h/[slug]/property/projects/page.tsx
app/(app)/app/h/[slug]/property/projects/new/page.tsx
app/(app)/app/h/[slug]/property/projects/[projectId]/page.tsx
app/(app)/app/h/[slug]/property/maintenance/page.tsx
app/(app)/app/h/[slug]/property/logbook/page.tsx

components/property/property-shell.tsx
components/property/property-skeletons.tsx
components/property/projects/*  (list, detail, forms, status, budget, tasks, links, attachments)
components/property/maintenance/*  (plans list/form, occurrences list, complete/skip/promote dialogs)
components/property/logbook/*  (list, history-entry-form [reusable], photo grid)
components/property/status-badge.tsx, money.tsx (if duplicating)
```

---

## 6. Suggested doc split (optional, to match Economy)

If you want the Economy-style per-phase docs, split §3 into
`docs/workflows/phase-1-property-shell.md` … `phase-6-property-logbook.md`, each
restating the relevant Global rules callouts + Acceptance. This master file is
sufficient to build from as-is.
