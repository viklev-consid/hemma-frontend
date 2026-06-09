# Phase 1 — Economy Core UI · Execution Plan

> Execution detail for **Phase 1** of [`economy-household-frontend-plan.md`](../../economy-household-frontend-plan.md).
> Source-plan goal: _"first-run setup, accounts, categories, budget editor."_
> Builds on the completed Phase 0 households rename. Prereq: be on a branch off the merged Phase 0.

## Status of prerequisites

- ✅ **Economy API is in the generated client.** All Phase 1 operations exist: `createEconomySettings`, `updateEconomyCycleStartDay`, `listEconomyAccounts` / `createEconomyAccount` / `getEconomyAccountBalances`, `listEconomyCategories` / `addEconomyCategory`, `createEconomyBudget` / `upsertEconomyBudgetLine` / `copyEconomyBudgetFromPreviousPeriod` / `getEconomyBudgetSummary`.
- ✅ **Closed-domain enums are typed.** `AccountType = 'Spending' | 'Savings'`, `Currency = 'SEK'`, plus `zAccountType` / `zCurrency` for form validation.
- ✅ **Money is single-typed.** `MoneyResponse.amount` / `MoneyRequest.amount` are `string` (no `number | string` union).

## How economy endpoints scope to a household (verified)

- **Mutations** (`POST`/`PUT`) take `householdId` in the **request body** (e.g. `CreateAccountRequest.householdId`).
- **Reads** (`GET`) take `householdId` (and where relevant `anchorDate`) as **query params**.
- → The FE always sources `householdId` from `useHousehold()` inside the household shell. Economy screens live under `/h/[slug]/...`, so the context is always present.

---

## Open questions — ✅ all resolved (backend-confirmed)

1. ✅ **First-run detection — use `GET /v1/economy/settings?householdId=…`.** `200` → `{ settingsId, householdId, cycleStartDay, defaultCurrency, createdOn }`; `404` → economy not initialized yet (show the wizard). **Do NOT use `/accounts` as the discriminator** — it returns an empty list independently of setup state.
   - ✅ **Client re-synced.** `pnpm api:sync && pnpm api:generate` has pulled in the endpoint and the `getEconomySettings` / `getEconomySettingsOptions` / `getEconomySettingsQueryKey` hooks. Response: `GetEconomySettingsResponse { settingsId, householdId, cycleStartDay, defaultCurrency, createdOn }`; `200` + `404` documented. Typecheck stays green. WS1 is unblocked.
2. ✅ **Seeded categories.** `POST /v1/economy/settings` seeds these **root** categories server-side, all `budgetable: true`: **Food, Housing, Transport, Savings, Personal**. So after setup, `listEconomyCategories` returns them — the wizard's "confirm seeded categories" step just displays them.
   - ⚠️ Note: seeded **names are English** (Food/Housing/…), not the Swedish labels the source plan sketched (Mat/Boende/…). Category names are user data, not i18n keys — the UI renders them verbatim. If Swedish defaults are wanted, that's a backend seed change, not FE copy. Flag to product before assuming.
3. ✅ **`cycleStartDay` range.** Backend enforces **1–28** at both request-validation and domain level. Out-of-range → **HTTP 422**, field in the ProblemDetails **`errors` object keyed by `CycleStartDay`** (PascalCase), **not** `extensions.errorCode`. → maps cleanly to a TanStack Forms field error via the existing ProblemDetails mapper (validation path).
4. ✅ **`anchorDate` = any date within the target cycle.** Backend resolves it via `GetPeriodContaining(anchorDate)` using `cycleStartDay`. → The FE passes **`today`** for the current period; **no period math in the browser**. `copy-from-previous` likewise takes the current-period anchor and copies the prior period server-side.

---

## Global rules (from the source plan — apply throughout)

- **SEK-only.** Never render a currency picker. Forms submit `currency: "SEK"` automatically (use `zCurrency`/the `Currency` enum, never a literal).
- **No money math in the browser.** Display `MoneyResponse` values via the shared formatter; never add/subtract amounts client-side.
- **Membership-gated, not permission-string-gated.** Both `owner` and `member` use all normal Economy actions. Do **not** gate economy mutations behind `HOUSEHOLD_PERMISSION.*` — being inside the household shell (any role) is the gate. (See the Phase 0 design note in `docs/workflows/phase-0-households-rename.md`.)
- **Forms:** TanStack Forms + generated Zod schemas (`zCreateAccountRequest`, `zCreateEconomySettingsRequest`, etc.) + the ProblemDetails mapper (`api/problems.ts`). No per-form error handling.
- **Reads:** server prefetch + React Query hydration for first-paint (accounts, categories, budget-summary) per ADR 0009; `client: serverClient` in the server component.
- **URL state:** `nuqs` for the selected period (`anchorDate`) in budget views.

---

## Routing & shell

Economy is a household sub-section under the existing household shell:

```
app/(app)/app/h/[slug]/economy/
├── layout.tsx                 — economy sub-nav + first-run gate (getEconomySettings 404 → redirect to setup)
├── page.tsx                   — economy home (redirect to /budget or a light overview)
├── setup/page.tsx             — first-run wizard
├── accounts/page.tsx
├── categories/page.tsx
└── budget/page.tsx            — budget editor + overview (nuqs ?period=)
```

- Add an "Economy" entry to the household nav (`components/app-shell/household-nav.tsx` or the household shell nav list).
- Components live in `components/economy/` (new folder; mirror the `components/households/` conventions + add an `AGENTS.md` crib sheet once stable).

---

## Workstreams (suggested order)

### WS0 — Cross-cutting economy utilities (build first; unblocks everything)

Per the plan's "Cross-Cutting Utilities — build early":

- `lib/economy/money.ts` — SEK formatter for `MoneyResponse` (`{ amount: string, currency }`) → `Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' })`. A `<Money value={...} />` display component. A `MoneyInput` that emits `{ amount: string, currency: "SEK" }` (no picker).
- `lib/economy/period.ts` — cycle/period display helpers (label `periodStartsOn`–`periodEndsOn`; cycle-start-day label). **Labels only — no period math** (backend owns periods).
- `lib/economy/nuqs-parsers.ts` — parser for `?period=`/`anchorDate` (and later filters/pagination).
- Shared loading/empty/error states — reuse `components/ui/skeleton` + the existing empty/error patterns; add economy-specific skeletons.
- Validators: `cycleStartDay` 1–28; money input (non-negative SEK decimal string). Co-locate with `*.test.ts`.

### WS1 — Setup wizard (`setup/page.tsx`)

- First-run gate (in `economy/layout.tsx`): call `getEconomySettings({ query: { householdId } })`; `404` → render/redirect to the wizard, `200` → economy initialized, proceed. (Treat the 404 as a valid "uninitialized" state, not an error toast.)
- Fixed currency SEK — no choice rendered; submit `defaultCurrency: "SEK"`.
- Cycle start day picker constrained to **1–28** (WS0 validator). Backend rejects out-of-range with **422 / `errors.CycleStartDay`** → surfaces as a field error through the standard ProblemDetails→TanStack-Forms mapper (no custom handling).
- Confirm seeded categories step: after `createEconomySettings`, the backend has seeded **Food, Housing, Transport, Savings, Personal** (all budgetable) — fetch `listEconomyCategories` and display them for confirmation. (Names render verbatim; they're data, not i18n — see open-Q #2 note.)
- Submits via `createEconomySettingsMutation` (+ `updateEconomyCycleStartDay` for later edits). `householdId` from `useHousehold()`.
- On success, invalidate economy reads (`getEconomySettings`, categories) and route into `/economy/budget` (or accounts).

### WS2 — Accounts (`accounts/page.tsx`)

- List via `listEconomyAccountsOptions({ query: { householdId } })`; show balances via `getEconomyAccountBalances`.
- Create account: name, `type` (`Spending | Savings` — from `AccountType`/`zAccountType`), `openingBalance` via `MoneyInput` → `{ amount, currency: "SEK" }`. No currency selector.
- Invalidate `listEconomyAccountsQueryKey` + balances on success.

### WS3 — Categories (`categories/page.tsx`)

- Render the tree from `listEconomyCategories` (`CategoryResponse.children` is the nesting; `parentCategoryId` + `budgetable`).
- **Prevent a third level:** disable "add subcategory" when the parent already has a `parentCategoryId` (depth 2 is the max). Handle backend rejection gracefully (ProblemDetails → toast) as a backstop.
- Budgetable vs non-budgetable: non-budgetable categories show a "tracked / no budget" affordance.
- Add category via `addEconomyCategoryMutation` (`name`, `parentCategoryId`, `budgetable`, `householdId`).

### WS4 — Budget editor (`budget/page.tsx`)

- Resolve the current period via `anchorDate` (today; pending open-Q #4) → `getEconomyBudgetSummary({ query: { householdId, anchorDate } })` for planned/actual, and `createEconomyBudget` to materialize a period if needed.
- **Budgetable categories** render as editable lines → `upsertEconomyBudgetLineMutation` (`budgetId`, `categoryId`, `amount` via `MoneyInput`).
- **Non-budgetable categories** render as tracked/read-only/no-budget (join `listCategories` against the budget lines — FE display join only, no math).
- **"Kopiera från föregående period"** → `copyEconomyBudgetFromPreviousPeriodMutation`. An empty prior period yields an empty editable budget, **not an error** — handle the empty result as a valid state.
- `nuqs` `?period=` selects the period; survives refresh/share.

### WS5 — Verification

- `pnpm typecheck` + `pnpm lint` (0 errors) · `pnpm test --run` · `pnpm build` (new routes + layout).
- Manual: SEK is fixed everywhere (no picker); third category level is disabled and a backend rejection is handled gracefully; owner **and** member can both reach and use setup/accounts/categories/budget.
- `react-doctor` — no score regression. `permission-review` only if any `<Can>`/permission guard is added (economy should use membership gating, so likely N/A).

---

## Acceptance criteria (from the source plan)

- ✅ Third category level is disabled in the UI and backend rejection handled gracefully.
- ✅ SEK is fixed in all money entry (no currency picker anywhere).
- ✅ Owner and member can both use the Economy setup/budget screens (membership-gated).
- ✅ "Copy from previous" works; empty prior period shows an empty editable budget, not an error.

---

## Contract appendix — Phase 1 request/response shapes (from generated client)

| Operation                                    | Key fields                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getEconomySettings` (GET)                   | query: `householdId` → `200 { settingsId, householdId, cycleStartDay, defaultCurrency, createdOn }` / `404` = uninitialized                                                                |
| `createEconomySettings` (POST)               | body: `householdId`, `cycleStartDay` (1–28; 422 `errors.CycleStartDay` if invalid), `defaultCurrency: Currency`. Seeds roots: Food, Housing, Transport, Savings, Personal (all budgetable) |
| `updateEconomyCycleStartDay` (PUT)           | body: `householdId`, `cycleStartDay`                                                                                                                                                       |
| `createEconomyAccount` (POST)                | body: `householdId`, `name`, `type: AccountType`, `openingBalance: MoneyRequest`                                                                                                           |
| `listEconomyAccounts` (GET)                  | query: `householdId` → `{ accounts: AccountResponse[] }`                                                                                                                                   |
| `getEconomyAccountBalances` (GET)            | query: `householdId` → `{ accounts: AccountBalanceResponse[] }` (`balance: MoneyResponse`)                                                                                                 |
| `addEconomyCategory` (POST)                  | body: `householdId`, `name`, `parentCategoryId`, `budgetable: boolean`                                                                                                                     |
| `listEconomyCategories` (GET)                | query: `householdId` → tree via `CategoryResponse.children`                                                                                                                                |
| `createEconomyBudget` (POST)                 | body: `householdId`, `anchorDate` → `BudgetResponse` (`periodStartsOn/EndsOn`, `lines`)                                                                                                    |
| `upsertEconomyBudgetLine` (PUT)              | body: `householdId`, `budgetId`, `categoryId`, `amount: MoneyRequest`                                                                                                                      |
| `copyEconomyBudgetFromPreviousPeriod` (POST) | body: `householdId`, `anchorDate`                                                                                                                                                          |
| `getEconomyBudgetSummary` (GET)              | query: `householdId`, `anchorDate` → `BudgetSummaryLineResponse[]` (`planned`, `actual`, `pacePercent`, `isOverPace`, `elapsedPercent`)                                                    |

> `MoneyRequest` / `MoneyResponse` = `{ amount: string, currency: Currency }`. Always submit `currency: "SEK"`. `cycleStartDay`, `pacePercent`, `elapsedPercent` are `number | string` unions in the spec — read as-is, format for display, don't compute.
