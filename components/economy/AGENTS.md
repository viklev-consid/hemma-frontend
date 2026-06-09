# Economy module — frontend contract crib sheet

UI for the backend **Economy** module (Phase 1: setup, accounts, categories,
budget). Built per `docs/workflows/phase-1-economy-core.md`. Records the
non-obvious contract points so an agent walking in cold makes correct calls.

## Source-of-truth files in this repo

| Concern                                                 | File                                   |
| ------------------------------------------------------- | -------------------------------------- |
| SEK formatter, money validators, `toMoneyRequest`       | `lib/economy/money.ts`                 |
| `<Money>` display + `<MoneyInput>` (no currency picker) | `components/economy/money.tsx`         |
| cycle-start-day bounds (1–28) + options                 | `lib/economy/cycle.ts`                 |
| period range label (label-only, no math)                | `lib/economy/period.ts`                |
| anchor-date helpers, server-safe (no nuqs)              | `lib/economy/anchor-date.ts`           |
| `?period=` nuqs parser, **client-only**                 | `lib/economy/nuqs-parsers.ts`          |
| slug → householdId for prefetch, **server-only**        | `lib/economy/resolve-household-id.ts`  |
| first-run gate + economy sub-nav                        | `components/economy/economy-shell.tsx` |

## Contract points — get these right

### 1. SEK-only, everywhere

There is **no currency picker**. Money is entered via `<MoneyInput>` (raw
decimal string) and submitted with `toMoneyRequest()`, which always stamps
`currency: "SEK"`. Display via `<Money>` / `formatMoney` (locale `sv-SE`).
Amounts are decimal **strings** — never do arithmetic in the browser; parsing
to a number is for display formatting only.

### 2. Membership-gated, NOT permission-string-gated

Both `owner` and `member` use all economy actions. Do **not** wrap economy
mutations in `<Can>` / `useHasHouseholdPermission`. Being inside the household
shell (any role) is the gate. `householdId` comes from `useHousehold()`.

### 3. First-run discriminator is `GET /v1/economy/settings`

`200` → initialized; `404` → uninitialized (a **valid state, never an error
toast**). The generated query uses `throwOnError: true`, so a 404 surfaces as
`error.status === 404`. `EconomyShell` redirects uninitialized → `setup`, and
sends initialized users off `setup` → `budget`. **Do not** use `/accounts` as
the discriminator — it returns an empty list independent of setup state.

### 4. Seeded category names are English, rendered verbatim

`POST /economy/settings` seeds roots **Food, Housing, Transport, Savings,
Personal** (all budgetable). Names are user data, not i18n keys — render as-is.
Swedish defaults would be a backend seed change (flag to product).

### 5. cycleStartDay 1–28; out-of-range → 422 `errors.CycleStartDay`

The picker only offers 1–28 (`cycleStartDayOptions`). The backend rejects
out-of-range with 422 keyed by `CycleStartDay` (PascalCase) → the standard
ProblemDetails mapper turns it into a `cycleStartDay` field error. No custom
handling.

### 6. Category depth is capped at 2

"Add subcategory" is only offered on **root** categories (`parentCategoryId ===
null`). The backend rejects a third level; `AddCategoryDialog` handles that
rejection via `handleProblem` as a backstop.

### 7. anchorDate, not period math

The browser never computes period boundaries. `?period=` carries an
`anchorDate` (any date in the target cycle); the backend resolves the period.
Prev/next step **one day** outside the backend-returned `periodStartsOn` /
`periodEndsOn` (via `addDays`) to land an anchor in the adjacent period — that's
anchor derivation, not period computation.

### 8. The budget summary auto-provides `budgetId`

`getEconomyBudgetSummary` returns `budgetId` + `lines` + period range for the
resolved period (it documents only a 200 — no 404). Upsert lines against
`summary.budgetId` directly; `createEconomyBudget` is **not** needed on the
read path. "Copy from previous period" may return an **empty** budget — that's a
valid editable state, not an error.

### 9. nuqs parser is client-only

`lib/economy/nuqs-parsers.ts` calls `createParser()` (client-only). Importing
**any** export from it into a server component evaluates `createParser` on the
server and **fails the build**. Server components (page prefetch) must use
`lib/economy/anchor-date.ts` instead.

## Forms

TanStack Forms + generated Zod (`zCreateEconomySettingsRequest`,
`zCreateAccountRequest`, `zAddCategoryRequest`, `zUpsertBudgetLineRequest`) +
the ProblemDetails mapper (`api/problems.ts`). No per-form error handling.
After scope-changing mutations, invalidate the relevant economy query keys
(and balances/accounts together on account create).

## When you change anything here

Run `pnpm typecheck`, `pnpm lint`, `pnpm test --run`, and `pnpm build` (routing

- server/client boundaries — the nuqs boundary in #9 is build-only).
  `permission-review` is **N/A** unless you add a `<Can>`/permission guard
  (economy is membership-gated). Note `pnpm build` requires `SESSION_SECRET` set
  (see `.env.example`).
