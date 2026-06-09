# Phase 3 — Recurring Bills UI · Execution Plan

> Execution detail for **Phase 3** of [`economy-household-frontend-plan.md`](../../economy-household-frontend-plan.md).
> Source-plan goal: _"manage fixed/estimated recurring bills and confirmations."_
> Builds on the completed Phase 2 (transactions / receipts / transfers). Prereq: be on a branch off the merged Phase 2.

## Status of prerequisites

- ✅ **Recurring-bills API is in the generated client.** All Phase 3 operations exist and are typed: `listEconomyRecurringBills`, `createEconomyRecurringBill`, `confirmEconomyEstimatedBill`, `skipEconomyRecurringBillOccurrence`, `pauseEconomyRecurringBillOccurrence`, `resumeEconomyRecurringBillOccurrence` (+ matching `*Mutation` / `*Options` / `*QueryKey` hooks).
- ✅ **Closed-domain enums are typed.** `RecurringBillType = 'Fixed' | 'Estimated'`, `RecurringBillDirection = 'Expense' | 'Income'`, `CadenceFrequency = 'Monthly'`, `RecurringBillOccurrenceState = 'Pending' | 'Posted' | 'Confirmed' | 'Skipped' | 'Paused'` — plus `zRecurringBillType` / `zRecurringBillDirection` / `zCadenceFrequency` / `zRecurringBillOccurrenceState` for validation.
- ✅ **Money stays single-typed.** `MoneyRequest.amount` / `MoneyResponse.amount` are `string`. `cadenceInterval` / `cadenceDayOfMonth` are plain `number`.
- ✅ **Phase 1/2 utilities are reusable.** `lib/economy/money.ts` (`formatMoney`, `toMoneyRequest`, `isValidMoneyAmount`), `components/economy/money.tsx` (`<Money>`, `<MoneyInput>`), `lib/economy/anchor-date.ts` (`todayAnchorDate`), `lib/economy/period.ts` (`formatEconomyDate`), `lib/economy/cycle.ts` (1–28 day bound + `cycleStartDayOptions`), `lib/economy/resolve-household-id.ts`, the economy shell/sub-nav, and the economy skeletons all carry over. **Reuse them.** See [`components/economy/AGENTS.md`](../../components/economy/AGENTS.md).
- ✅ **Account / category pickers exist** from Phase 1/2: `listEconomyAccounts` and `listEconomyCategories` + `flattenCategories` (`lib/economy/category-tree.ts`).

## How endpoints scope to a household (verified)

- **Create** (`POST /v1/economy/recurring-bills`): `householdId` is in the **body** (`CreateRecurringBillRequest.householdId`).
- **List** (`GET /v1/economy/recurring-bills`): `householdId` is a **query param**.
- **Occurrence actions + confirm** (`POST .../{recurringBillId}/skip|pause|resume|confirm`): `recurringBillId` is a **path param**; `householdId` is in the **body**.
- → The FE always sources `householdId` from `useHousehold()`. All Phase 3 screens live under `/h/[slug]/economy/...`. Server prefetch resolves it via `resolveHouseholdId(slug)`.

---

## Open questions — ✅ all resolved (generated-client-confirmed)

1. ✅ **The list returns bills with their pending occurrences embedded — there is no separate occurrence endpoint and no history.** `ListRecurringBillsResponse { recurringBills: RecurringBillResponse[] }`, and each `RecurringBillResponse` carries `pendingOccurrences: RecurringBillOccurrenceResponse[]` plus `nextDueOn`. So **one `listEconomyRecurringBills` query feeds the bills list AND the confirmation inbox** (the inbox is derived client-side, not fetched separately). Per the source plan: **do not build a historical occurrence timeline** — only pending occurrences exist in the contract.
2. ✅ **Occurrence actions target an existing occurrence by `recurringBillId` (path) + `dueOn` (body) — never a free-form date.** `skip` / `pause` / `resume` all take `ChangeRecurringBillOccurrenceRequest { householdId, dueOn }`. The UI passes the **occurrence's own `dueOn`** (from `pendingOccurrences[].dueOn`), not a user-picked date. This is the "no arbitrary future-date drift" guard from the source plan — there is no date picker on these actions. All three return the updated `RecurringBillResponse`; invalidate the list on success.
3. ✅ **Confirm provides the real amount for an estimated occurrence.** `confirmEconomyEstimatedBill`: path `recurringBillId`, body `ConfirmEstimatedBillRequest { householdId, transactionId, amount: MoneyRequest, occurredOn }` → returns the resulting `TransactionResponse`. The `transactionId` comes from the confirmable occurrence (`RecurringBillOccurrenceResponse.transactionId`, which is `null | string`). **The confirmable set = occurrences with a non-null `transactionId` on `Estimated` bills** (you can't confirm an occurrence that has no posted transaction yet). Confirming removes it from the inbox once the list refetches. ⚠️ The exact occurrence `state` of a confirmable item (`Posted` vs `Pending`) isn't fully determinable from types — gate on `transactionId != null` (robust) and verify the state against real data before adding state-specific copy.
4. ✅ **Cadence is monthly-only with interval + day-of-month.** `CreateRecurringBillRequest` carries `cadenceFrequency: CadenceFrequency` (only `'Monthly'`), `cadenceInterval: number` (every N months), `cadenceDayOfMonth: number`, plus `startsOn` (ISO date). Render frequency as fixed (no picker beyond Monthly). Constrain `cadenceDayOfMonth` to **1–28** (reuse `cycleStartDayOptions()` — the day must exist in every month, same rationale as the cycle start day); constrain `cadenceInterval` to a sensible 1–12. The backend is authoritative and returns `422` for out-of-range (maps through the ProblemDetails handler). ⚠️ Confirm the backend's exact `cadenceDayOfMonth` bound; 1–28 is the safe assumption.
5. ✅ **No edit and no delete.** There is **no** update-bill or delete-bill operation in the client (only list / create / confirm / skip / pause / resume). So Phase 3 ships **create + list + occurrence actions only** — no edit-bill form, no delete affordance. Don't invent endpoints; flag to product if editing is needed.
6. ✅ **Estimated vs Fixed is `RecurringBillType`; direction is `RecurringBillDirection`.** Both are first-class enums on the bill — render `Fixed`/`Estimated` distinctly (the source plan requires estimated to be clearly distinct), and show direction (`Expense`/`Income`). SEK-only; `amount` is a `MoneyRequest`.

---

## Global rules (from the source plan — apply throughout)

- **SEK-only.** No currency picker. Amounts via `<MoneyInput>` → `toMoneyRequest` (stamps `currency: "SEK"`).
- **No money math in the browser.** Display `MoneyResponse` via `<Money>` / `formatMoney`. `nextDueOn` / `dueOn` / `startsOn` are backend-computed dates — render with `formatEconomyDate`, never derive the next occurrence client-side.
- **Membership-gated, not permission-string-gated.** Both `owner` and `member` manage recurring bills and confirm occurrences. No `<Can>` / `HOUSEHOLD_PERMISSION.*` gates — being inside the household shell is the gate.
- **Forms:** TanStack Forms + generated Zod (`zCreateRecurringBillRequest`, `zConfirmEstimatedBillRequest`, `zChangeRecurringBillOccurrenceRequest`) + the ProblemDetails mapper (`api/problems.ts`). No per-form error handling.
- **Reads:** server prefetch + React Query hydration for first paint (`listEconomyRecurringBills`) per ADR 0009; `client: serverClient` in the server component.
- **URL state:** `nuqs` only where there's genuine shareable state (e.g. a `?type=` filter on the list, if added). The inbox/list don't need URL state beyond that.
- **Copy:** English i18n (`messages/en`, wired through `messages/en/index.ts`) as in Phase 0–2. The source plan's Swedish strings ("Bekräfta") are illustrative — render via i18n keys with English values unless product asks for a Swedish locale.
- **Mobile-first.** The bills list and inbox are phone-first cards; desktop is an enhancement. No `useIsMobile`.

---

## Routing & shell

Recurring bills are a new economy sub-section. The confirmation **inbox is derived from the same list query**, so it lives at the top of the recurring page rather than as a separate fetch:

```
app/(app)/app/h/[slug]/economy/recurring/
├── page.tsx          — confirmation inbox (top) + bills list (Fixed/Estimated)
└── new/page.tsx      — create recurring bill (standalone; optional @modal intercept)
```

- Add a **Recurring** (or **Recurring bills**) entry to the economy sub-nav in `components/economy/economy-shell.tsx` (`tabs` array) + a `economy.shell.nav.recurring` i18n key and `metadata.app.economy.recurring` / `recurringNew` titles.
- New components in `components/economy/` (mirror existing economy conventions). Update `components/economy/AGENTS.md` with the Phase 3 contract points once stable.
- A create **modal** is optional polish — follow the intercepted-route recipe in [`components/AGENTS.md`](../../components/AGENTS.md). Ship the standalone `new/page.tsx` first.

---

## Workstreams (suggested order)

### WS0 — Cross-cutting recurring utilities (build first)

- `lib/economy/cadence.ts` — `formatCadence({ cadenceFrequency, cadenceInterval, cadenceDayOfMonth })` → label like _"Every month on day 25"_ / _"Every 2 months on day 1"_ (label-only, no schedule math; the backend owns `nextDueOn`). `cadenceDayOptions()` (reuse `cycleStartDayOptions`, 1–28) and `cadenceIntervalOptions()` (1–12). Tests.
- `lib/economy/recurring-bill.ts` — `RECURRING_BILL_TYPE` / `RECURRING_BILL_DIRECTION` / `OCCURRENCE_STATE` constants (mirror the `TRANSFER_MODE` pattern) and `confirmableOccurrences(bills)` → flattens `Estimated` bills' `pendingOccurrences` to those with a non-null `transactionId` (the inbox source), each tagged with its `recurringBillId` + bill name. Tests.
- Reuse Phase 1/2 skeletons; add a recurring-bill card skeleton + an inbox-row skeleton to `components/economy/economy-skeletons.tsx`.

### WS1 — Bills list (`recurring/page.tsx`)

- List via `listEconomyRecurringBillsOptions({ query: { householdId } })`; server-prefetch for first paint.
- Each bill card: **name**, **type badge** (Fixed vs Estimated — visually distinct, source-plan requirement), **direction** (Expense/Income), **amount** (`<Money>`), **cadence** (`formatCadence`), **next due** (`nextDueOn` via `formatEconomyDate`), and **account / category** names (join `listEconomyAccounts` + `listEconomyCategories`, display-only).
- Show each bill's **pending occurrences** (`dueOn` + `state` badge) inline; these are the rows the per-occurrence actions (WS4) attach to.
- Empty state when no bills. Mobile-first cards. (Optional `?type=` filter via nuqs.)

### WS2 — Create bill (`recurring/new/page.tsx`)

- TanStack form → `createEconomyRecurringBillMutation`, validated with `zCreateRecurringBillRequest`. Fields: `name`, `amount` (`MoneyInput`, SEK), `type` (`Fixed | Estimated`), `direction` (`Expense | Income`), `cadenceFrequency` (fixed `Monthly`), `cadenceInterval` (1–12 select), `cadenceDayOfMonth` (1–28 select), `accountId` (accounts), `categoryId` (optional, flattened categories), `startsOn` (date, default today), `note` (optional). `householdId` from `useHousehold()`.
- On success: invalidate `listEconomyRecurringBillsQueryKey`; route back to the list.

### WS3 — Pending confirmation inbox (top of `recurring/page.tsx`)

- Derive the inbox from the **same** `listEconomyRecurringBills` query via `confirmableOccurrences(bills)` (WS0) — no extra fetch. Show it only when non-empty.
- Each inbox row: bill name, due date, the estimate's posted amount, and an inline **"Confirm"** (`Bekräfta`) action that opens a real-amount input (`MoneyInput`, default to the estimate) + confirm.
- Submit `confirmEconomyEstimatedBillMutation({ path: { recurringBillId }, body: { householdId, transactionId, amount: toMoneyRequest(real), occurredOn } })` — `transactionId` and `recurringBillId` come from the occurrence/bill. On success: invalidate the list → the confirmed occurrence drops out of the inbox.

### WS4 — Per-occurrence actions (skip / pause / resume)

- On each pending-occurrence row in the bills list, offer **skip / pause / resume** as appropriate for the occurrence `state` (e.g. resume only a `Paused` one). Each calls its mutation with `{ path: { recurringBillId }, body: { householdId, dueOn: occurrence.dueOn } }`.
- **No date picker** — the action always targets that occurrence's own `dueOn` (open-Q #2). Skipping one occurrence must not visually alter the rest of the schedule (the list refetch reflects only that occurrence's new state; `nextDueOn` and other occurrences stay as the backend returns them).
- Invalidate `listEconomyRecurringBillsQueryKey` on success; surface business errors via the ProblemDetails handler.

### WS5 — Verification

- `pnpm typecheck` + `pnpm lint` (0 errors) · `pnpm test --run` · `pnpm build` (new routes; watch the nuqs client/server boundary if a list filter is added). `pnpm build` needs `SESSION_SECRET` (`.env.example`).
- Manual: estimated bills are clearly distinct from fixed; confirming a pending bill removes it from the inbox; skipping one occurrence doesn't alter the later recurring setup; SEK fixed everywhere; owner **and** member can both manage bills and confirm.
- `react-doctor` — no score regression. `permission-review` only if a `<Can>`/permission guard is added (recurring bills are membership-gated, so likely N/A).

---

## Acceptance criteria (from the source plan)

- ✅ Estimated bills clearly distinct from fixed.
- ✅ Confirming a pending bill removes it from the inbox.
- ✅ Skipping one occurrence does not visually alter the later recurring setup.
- ✅ Cadence is monthly with interval/day; amount is SEK-only.
- ✅ Owner and member can both manage recurring bills (membership-gated).

---

## Contract appendix — Phase 3 request/response shapes (from generated client)

| Operation                                     | Key fields                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listEconomyRecurringBills` (GET)             | query: `householdId` → `ListRecurringBillsResponse { recurringBills: RecurringBillResponse[] }`                                                                                                                                                                                                                                   |
| `createEconomyRecurringBill` (POST)           | body `CreateRecurringBillRequest`: `householdId`, `name`, `accountId`, `categoryId: null\|string`, `amount: MoneyRequest`, `type: RecurringBillType`, `direction: RecurringBillDirection`, `cadenceFrequency`, `cadenceInterval: number`, `cadenceDayOfMonth: number`, `startsOn`, `note: null\|string` → `RecurringBillResponse` |
| `confirmEconomyEstimatedBill` (POST)          | path `recurringBillId`; body `ConfirmEstimatedBillRequest { householdId, transactionId, amount: MoneyRequest, occurredOn }` → `TransactionResponse`                                                                                                                                                                               |
| `skipEconomyRecurringBillOccurrence` (POST)   | path `recurringBillId`; body `ChangeRecurringBillOccurrenceRequest { householdId, dueOn }` → `RecurringBillResponse`                                                                                                                                                                                                              |
| `pauseEconomyRecurringBillOccurrence` (POST)  | path `recurringBillId`; body `{ householdId, dueOn }` → `RecurringBillResponse`                                                                                                                                                                                                                                                   |
| `resumeEconomyRecurringBillOccurrence` (POST) | path `recurringBillId`; body `{ householdId, dueOn }` → `RecurringBillResponse`                                                                                                                                                                                                                                                   |

**Enums:** `RecurringBillType = 'Fixed' \| 'Estimated'` · `RecurringBillDirection = 'Expense' \| 'Income'` · `CadenceFrequency = 'Monthly'` · `RecurringBillOccurrenceState = 'Pending' \| 'Posted' \| 'Confirmed' \| 'Skipped' \| 'Paused'`.

**Key response shapes:**

- `RecurringBillResponse { recurringBillId, householdId, name, accountId, categoryId, amount: MoneyResponse, type, direction, cadenceFrequency, cadenceInterval, cadenceDayOfMonth, startsOn, nextDueOn, note, pendingOccurrences: RecurringBillOccurrenceResponse[] }`
- `RecurringBillOccurrenceResponse { dueOn, state: RecurringBillOccurrenceState, transactionId: null | string }`

> `MoneyRequest`/`MoneyResponse` = `{ amount: string, currency: Currency }` — always submit `currency: "SEK"`. Dates (`startsOn`, `nextDueOn`, `dueOn`, `occurredOn`) are ISO `YYYY-MM-DD` strings — render, don't compute. There is **no** update/delete-bill and **no** single-bill GET; bill detail comes from the list response. The confirmation inbox is derived from `listEconomyRecurringBills` (occurrences with a non-null `transactionId` on `Estimated` bills), not a separate endpoint.
