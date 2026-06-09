# Economy module — frontend contract crib sheet

UI for the backend **Economy** module (Phase 1: setup, accounts, categories,
budget; Phase 2: transactions, receipts, transfers, budget pace). Built per
`docs/workflows/phase-1-economy-core.md` and
`docs/workflows/phase-2-transactions-receipts-transfers.md`. Records the
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

## Phase 2 contract points

### 10. Receipt upload is multipart via the generated hook

`attachEconomyTransactionReceiptMutation({ path: { transactionId }, body: {
householdId, file } })` — the generated SDK already spreads
`formDataBodySerializer` and sets `Content-Type: null`, and the BFF proxy
forwards `content-type` + streams the body. So **no manual FormData**. The FE
owns only client-side validation (`lib/economy/receipt.ts`: PDF/PNG/JPEG,
≤10 MB). `TransactionResponse.hasReceipt` is the indicator; there's no receipt
viewer. Record→attach is sequenced in `record-transaction-form.tsx`; a failed
attach keeps the saved transaction (retry from the list row via
`AttachReceiptButton`).

### 11. The record form is Expense/Income only; money movement is a transfer

`recordEconomyTransaction` takes `kind` — set `Expense`/`Income` only. Never
POST `kind: 'Transfer'`; use `createEconomyTransfer` (it materializes the paired
Transfer transactions). `TransferMode` is `'Neutral' | 'Savings'` (PascalCase);
the "record as savings" toggle defaults from the destination account type
(`defaultTransferMode`) and is overridable. A neutral transfer reads as
movement, never spending.

### 12. Note search is a separate endpoint from the list

`searchEconomyTransactionNotes` (`/transactions/search`) ≠
`listEconomyTransactions`. A non-empty `?search=` swaps the list source; the
structured filters drive the list. The list is infinite
(`listEconomyTransactionsInfiniteOptions`) and manages pages internally — only
the **filters** live in the URL (`lib/economy/transaction-filters.ts`,
client-only), not the scroll position. There is no single `getEconomyTransaction`.

### 13. Payer is a member userId

`payerId` is a household-member `userId` (no payer DTO). Options come from
`listHouseholdMembers` via `lib/economy/payer.ts` (excludes anonymized; resolves
historical ids to a tombstone).

### 14. Two more server/client split modules (same rule as #9)

`lib/economy/transaction-filters.ts` is **client-only** (nuqs); server prefetch
imports `DEFAULT_TRANSACTION_PAGE_SIZE` from
`lib/economy/transaction-constants.ts` instead. `lib/economy/category-tree.ts`
(`flattenCategories`) and `lib/economy/transfer.ts` / `payer.ts` / `receipt.ts`
are pure and server-safe.

### 15. Budget pace percentages are ratios (display-only)

`elapsedPercent` / `pacePercent` are read as **ratios** (e.g. `0.8` → 80%) and
formatted ×100 for display in `budget-page.tsx`. ⚠️ This scale is an assumption
— verify against real backend data; if the backend already sends whole percents,
drop the ×100.

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
