# Phase 2 — Transactions · Receipts · Transfers · Budget Overview · Execution Plan

> Execution detail for **Phase 2** of [`economy-household-frontend-plan.md`](../../economy-household-frontend-plan.md).
> Source-plan goal: _"daily driver, mobile-first."_ — record transactions, attach receipts, move money between accounts, and read planned-vs-actual with pace.
> Builds on the completed Phase 1 economy core. Prereq: be on a branch off the merged Phase 1.

## Status of prerequisites

- ✅ **Economy API is in the generated client.** All Phase 2 operations exist and are typed: `recordEconomyTransaction`, `listEconomyTransactions` (+ `listEconomyTransactionsInfiniteOptions`), `searchEconomyTransactionNotes`, `attachEconomyTransactionReceipt`, `createEconomyTransfer`, `getEconomyBudgetSummary`.
- ✅ **Closed-domain enums are typed.** `TransactionKind = 'Expense' | 'Income' | 'Transfer'`, `TransferMode = 'Neutral' | 'Savings'` (PascalCase), `AccountType = 'Spending' | 'Savings'`, `Currency = 'SEK'` — plus `zTransactionKind` / `zTransferMode` / `zAccountType` / `zCurrency` for form validation.
- ✅ **Money stays single-typed.** `MoneyRequest.amount` / `MoneyResponse.amount` are `string`. `pacePercent` / `elapsedPercent` / `minAmount` / `maxAmount` / `page` / `pageSize` are `number | string` unions — read as-is, never compute.
- ✅ **Phase 1 utilities are reusable.** `lib/economy/money.ts` (`formatMoney`, `toMoneyRequest`, `isValidMoneyAmount`), `components/economy/money.tsx` (`<Money>`, `<MoneyInput>`), `lib/economy/anchor-date.ts` + `nuqs-parsers.ts`, `lib/economy/period.ts`, `lib/economy/resolve-household-id.ts`, the economy shell/sub-nav, and the economy skeletons all carry over. **Reuse them — do not re-implement money/period/SEK logic.** See [`components/economy/AGENTS.md`](../../components/economy/AGENTS.md).
- ✅ **Household members are available** for the payer picker: `listHouseholdMembers` (Phase 0) returns members with `userId` + `displayName` (both nullable for GDPR-erased members — handle the tombstone case).

## How economy endpoints scope to a household (verified)

- **Mutations** (`POST`): `householdId` is in the **request body** (`RecordTransactionRequest.householdId`, `CreateTransferRequest.householdId`).
- **Receipt attach** (`POST` multipart): `householdId` is a **multipart text field** in the body; `transactionId` is a **path param**.
- **Reads** (`GET`): `householdId` (+ filters, `anchorDate`, `page`/`pageSize`, `search`) are **query params**.
- → The FE always sources `householdId` from `useHousehold()` inside the household shell. All Phase 2 screens live under `/h/[slug]/economy/...`, so the context is always present. Server prefetch resolves it via `resolveHouseholdId(slug)`.

---

## Open questions — ✅ all resolved (generated-client-confirmed)

1. ✅ **Receipt upload through the BFF works via the generated mutation — no manual FormData.** The proxy (`app/api/proxy/[...path]/route.ts`) forwards `content-type` (it's in the allow-list) and streams the raw request body with `duplex: "half"`, so a multipart body and its boundary `Content-Type` pass through untouched. The generated `attachEconomyTransactionReceipt` already spreads `formDataBodySerializer` and sets `'Content-Type': null`, so calling `attachEconomyTransactionReceiptMutation` with `{ path: { transactionId }, body: { householdId, file } }` builds the `multipart/form-data` itself and lets the browser set the boundary. **Validate type + size client-side before submit** (the only thing the FE owns); the backend returns `422 HttpValidationProblemDetails` for server-side rejection, which maps cleanly through `api/problems.ts`.
2. ✅ **Receipt indicator is `TransactionResponse.hasReceipt` (boolean).** There is no `receiptId`/`receiptUrl` on the transaction. After a successful attach (`AttachReceiptResponse { transactionId, blobContainer, blobKey }`), invalidate the transactions list so the row re-renders with `hasReceipt: true`. **Do not build a receipt viewer/download flow** — out of scope for Phase 2 (and the source plan's "Do Not Build Yet" forbids a reserve/direct-blob flow).
3. ✅ **Payer = a household member `userId`.** `payerId` is an optional `null | string` UUID on both `RecordTransactionRequest` and `CreateTransferRequest`; there is **no `PayerResponse` type**. Source the payer picker from `listHouseholdMembers`, mapping `userId → displayName`. Erased members have a null `userId`/`displayName` (`isAnonymized`) — exclude them from the picker but still resolve a historical `payerId` to a "Unknown user" tombstone when displaying existing rows (mirror the households `MemberCell` pattern).
4. ✅ **Transfer mode is `'Neutral' | 'Savings'` (PascalCase) — submit it explicitly.** Default the **"Bokför som Sparande"** toggle **on** when the destination account `type === 'Savings'`; the user can override. A `Savings` transfer carries an optional `categoryId` (default to the seeded **Savings** root category — names are English in this app, see Phase 1 open-Q #2). A `Neutral` transfer reads as **movement, not spending** — never render it in spending totals or as an expense. `createEconomyTransfer` returns `{ transferId, mode, outflow, inflow }` (two `TransactionResponse`s); invalidate the transactions list and account balances on success.
5. ✅ **The record form is for `Expense` / `Income` only.** `recordEconomyTransaction` takes `kind: TransactionKind`. The form sets `Expense` (default) or `Income`. **Do not POST `kind: 'Transfer'` directly** — money movement goes through `createEconomyTransfer`, which materializes the paired `Transfer` transactions server-side.
6. ✅ **Free-text note search is a separate endpoint, not a list filter.** `searchEconomyTransactionNotes` (`GET /v1/economy/transactions/search`, query `{ householdId, search, page?, pageSize? }`) is distinct from `listEconomyTransactions`. Wire the note-search box to the search op and the structured filters (category / date / payer / hasReceipt / amount range) to the list op. Pick one active mode at a time (a non-empty `search` swaps the list source) to avoid ambiguous merged results.
7. ✅ **List pagination shape.** `ListTransactionsResponse { transactions, page, pageSize, totalCount }` (numbers are `number | string`). Mobile-first uses `listEconomyTransactionsInfiniteOptions` (append pages); a desktop table may use `listEconomyTransactionsOptions` with explicit `?page=`/`?pageSize=`. **There is no single `getEconomyTransaction`** — transaction detail comes from the list/record response, not a per-id fetch.

---

## Global rules (from the source plan — apply throughout)

- **SEK-only.** Never render a currency picker. Forms submit `currency: "SEK"` automatically via `toMoneyRequest` / the `Currency` enum.
- **No money math in the browser.** Display `MoneyResponse` via `<Money>` / `formatMoney`; never add/subtract/aggregate amounts client-side. Pace, elapsed, totals, and balances are backend-computed — render, don't recompute.
- **Membership-gated, not permission-string-gated.** Both `owner` and `member` record transactions, attach receipts, and create transfers. Do **not** gate economy mutations behind `HOUSEHOLD_PERMISSION.*` — being inside the household shell (any role) is the gate.
- **Mobile-first.** The transaction list and record form are designed phone-first; desktop table is optional enhancement. Use Tailwind responsive classes, **not** `useIsMobile` (avoids the hydration flash flagged in CLAUDE.md).
- **Forms:** TanStack Forms + generated Zod schemas (`zRecordTransactionRequest`, `zCreateTransferRequest`, etc.) + the ProblemDetails mapper (`api/problems.ts`). No per-form error handling.
- **Reads:** server prefetch + React Query hydration for first-paint (transaction list first page, budget summary) per ADR 0009; `client: serverClient` in the server component.
- **URL state:** `nuqs` for all transaction filters, the note search term, pagination, and the selected period — they must survive refresh/share.
- **Copy:** follow the established **English i18n convention** (`messages/en`, wired through `messages/en/index.ts`) as Phase 0/1 did. The source plan's Swedish strings ("Bokför som Sparande", "Kopiera från föregående period", the pace copy) are illustrative — render via i18n keys with English values. A Swedish locale would be a separate i18n workstream; flag to product before assuming. (Mirror the Phase 1 English-vs-Swedish decision.)

---

## Routing & shell

Phase 2 adds transaction/transfer surfaces under the existing economy sub-section and enriches the budget page's read side:

```
app/(app)/app/h/[slug]/economy/
├── transactions/
│   ├── page.tsx              — list + filters (nuqs) + note search; entry point for record
│   └── new/page.tsx          — record-transaction form (standalone; optional @modal intercept)
├── transfers/
│   └── page.tsx              — create transfer (from/to, SEK, Sparande toggle)
└── budget/page.tsx           — (Phase 1) extend the overview side: pace + elapsed + over-pace
```

- Add **Transactions** and **Transfers** entries to the economy sub-nav in `components/economy/economy-shell.tsx` (the `tabs` array: `budget`, `accounts`, `categories` → add `transactions`, `transfers`). Add matching `economy.shell.nav.*` i18n keys and `metadata.app.economy.*` titles.
- Consider making **Transactions** the economy landing surface (the daily driver) — re-point `economy/page.tsx` from `/budget` to `/transactions` once the list lands. Decide in WS3; keep the first-run gate intact.
- New components live in `components/economy/` (mirror the existing economy + households conventions). Update `components/economy/AGENTS.md` with the new contract points once stable.
- If a record-transaction **modal** is wanted, follow the intercepted-route recipe in [`components/AGENTS.md`](../../components/AGENTS.md): standalone `transactions/new/page.tsx` + `@modal/(.)…/transactions/new/page.tsx`, sharing the form via optional `onSuccess`/`onCancel`. Treat the modal as optional polish — ship the standalone page first.

---

## Workstreams (suggested order)

### WS0 — Cross-cutting Phase 2 utilities (build first; unblocks everything)

- `lib/economy/receipt.ts` — receipt file validators: accept **PDF, PNG, JPEG**; **max 10 MB**; reject empty. `isAllowedReceiptType(file)`, `isWithinReceiptSize(file)`, `RECEIPT_ACCEPT` (the `accept=` string), `RECEIPT_MAX_BYTES`. Co-locate `*.test.ts`.
- `lib/economy/transfer.ts` — `defaultTransferMode(destAccountType)` → `'Savings'` when dest is `Savings`, else `'Neutral'`; `TRANSFER_MODE` constants. Tests.
- `lib/economy/transaction-filters.ts` — `nuqs` parsers for the list filters: `categoryId`, `payerId` (string), `from`/`to` (reuse the anchor-date `YYYY-MM-DD` validator), `hasReceipt` (`parseAsBoolean`), `minAmount`/`maxAmount` (validated decimal string), `page`/`pageSize` (`parseAsInteger`), and `search` (string). **Client-only** (nuqs), like `nuqs-parsers.ts`. Tests for the custom parsers.
- `lib/economy/payer.ts` — `payerOptionsFromMembers(members)` (exclude anonymized, map `userId → displayName`) and `resolvePayerName(members, payerId)` (tombstone for null/erased). Tests.
- Shared loading/empty states — reuse Phase 1 economy skeletons; add a transaction-row skeleton + a mobile list skeleton.

### WS1 — Record-transaction form (`transactions/new/page.tsx`)

- Fields: `amount` (`MoneyInput`), `kind` (`Expense` default / `Income`), `categoryId` (from `listEconomyCategories` — budgetable + tracked both selectable; nullable allowed), `accountId` (from `listEconomyAccounts`), `occurredOn` (default **today**, `YYYY-MM-DD`), `note` (optional), `payerId` (optional, from member options — WS0). SEK fixed.
- Submit via `recordEconomyTransactionMutation`; `householdId` from `useHousehold()`. Validate with `zRecordTransactionRequest`; surface field/business errors via the ProblemDetails mapper.
- **Save without a receipt is allowed.** If the form also carries a selected receipt file, hand the returned `transactionId` to WS2's attach step (record → then attach).
- On success: invalidate `listEconomyTransactionsQueryKey` (+ infinite key) and account balances; route back to the list (or close the modal).

### WS2 — Receipt upload

- File input constrained by `RECEIPT_ACCEPT`; validate type + size with the WS0 helpers **before** submit; show friendly errors for unsupported / oversized / empty files (do not rely on the server round-trip for these).
- Attach via `attachEconomyTransactionReceiptMutation({ path: { transactionId }, body: { householdId, file } })` — the generated hook handles multipart (open-Q #1). Two entry points:
  1. Inline in the record form (record → attach, as a follow-on step).
  2. From a list row that has `hasReceipt: false` ("Lägg till kvitto" / "Add receipt").
- Upload **progress**: best-effort only through the BFF; **do not invent a direct-to-blob flow** (source plan forbids it). A pending spinner is acceptable if true progress isn't observable.
- On success (`AttachReceiptResponse`): toast + invalidate the transactions list so the row shows the receipt indicator (`hasReceipt`). If the transaction saved but the attach failed, keep the transaction and surface a retryable error — never silently drop the record.

### WS3 — Transaction list (`transactions/page.tsx`)

- **Filters in the URL via `nuqs`** (WS0 parsers): `categoryId`, `from`/`to`, `payerId`, `hasReceipt`, `minAmount`/`maxAmount`, `page`/`pageSize`. Drive `listEconomyTransactions`.
- **Free-text note search** wired to `searchEconomyTransactionNotes` (separate endpoint, open-Q #6). A non-empty `?search=` swaps the list source to the search results; clearing it returns to the filtered list. One active mode at a time.
- **Receipt indicator** column/affordance per row (`hasReceipt`), with an inline "add receipt" action (→ WS2) for rows without one.
- **Mobile-first list** (card rows: amount, category, date, payer, receipt badge) using `listEconomyTransactionsInfiniteOptions` (append on scroll / "Load more"); **optional** desktop `<table>` via `listEconomyTransactionsOptions` + compact pagination consuming `page`/`pageSize`/`totalCount`. No `useIsMobile`.
- Server-prefetch the **first page** (default filters) for first paint; resolve `householdId` via `resolveHouseholdId`.
- Render amounts with `<Money>`; show `kind` and `isPending` clearly. Map `payerId`/`categoryId` to names via the loaded members/categories (FE display join only — no math).

### WS4 — Transfers (`transfers/page.tsx`)

- From/to **account pickers** (`listEconomyAccounts`); guard against from == to.
- `amount` via `MoneyInput` (SEK); `occurredOn` default today; optional `note`.
- **"Bokför som Sparande" toggle** → sets `mode`. Default **on** when the destination account `type === 'Savings'` (WS0 `defaultTransferMode`); user can override. When `Savings`, allow an optional `categoryId` (default the Savings root category).
- Submit `createEconomyTransferMutation` with explicit `mode` + optional `categoryId`/`payerId`. Validate with `zCreateTransferRequest`.
- A **neutral** transfer must read as movement, not spending — copy and any per-account display must not present it as an expense. On success: invalidate transactions list + account balances + budget summary.

### WS5 — Budget overview (extend `budget/page.tsx`)

- Phase 1 built the editable budget. Phase 2 enriches the **read/overview** side from `getEconomyBudgetSummary`: **planned vs actual per category**, a **pace indicator** (copy like _"60% genom perioden, 80% spenderat"_ built from `elapsedPercent` + `pacePercent`, formatted as percentages — read the backend values, don't compute), and an **over-pace** visual flag from `isOverPace`.
- Keep it display-only and SEK-formatted; non-budgetable categories stay tracked/read-only. Reuse the existing period selector (`?period=`).

### WS6 — Verification

- `pnpm typecheck` + `pnpm lint` (0 errors) · `pnpm test --run` · `pnpm build` (new routes + nuqs client/server boundary — recall the Phase 1 lesson: never import a `createParser`-based module into a server component). `pnpm build` needs `SESSION_SECRET` set (`.env.example`).
- Manual: SEK fixed everywhere (no picker); a receipt-bearing expense uploads via multipart and then shows the receipt indicator; a **neutral** transfer does not appear as spending; a **savings** transfer appears under Sparande allocation; filters + note search survive refresh/share.
- `react-doctor` — no score regression (watch `no-derived-useState` on editable inputs — use the `draft ?? serverValue` pattern from Phase 1's budget rows). `permission-review` only if a `<Can>`/permission guard is added (economy is membership-gated, so likely N/A).

---

## Acceptance criteria (from the source plan)

- ✅ Expense with receipt uploads via multipart attach and then shows the receipt indicator.
- ✅ Neutral transfer does not appear as spending.
- ✅ Savings transfer appears under Sparande allocation.
- ✅ Filters survive refresh/share.
- ✅ Members and owners can both record transactions (membership-gated).
- ✅ Budget overview shows planned vs actual with pace, over-pace flagged.

---

## Contract appendix — Phase 2 request/response shapes (from generated client)

| Operation                                           | Key fields                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recordEconomyTransaction` (POST)                   | body `RecordTransactionRequest`: `householdId`, `accountId`, `categoryId: null\|string`, `amount: MoneyRequest`, `occurredOn` (ISO date), `note: null\|string`, `kind: TransactionKind`, `payerId: null\|string` → `TransactionResponse`                                                           |
| `listEconomyTransactions` (GET)                     | query: `householdId` (req), `categoryId?`, `from?`, `to?`, `payerId?`, `hasReceipt?: boolean`, `minAmount?`, `maxAmount?`, `page?`, `pageSize?` → `ListTransactionsResponse { transactions, page, pageSize, totalCount }`. Infinite via `listEconomyTransactionsInfiniteOptions`. No single `get`. |
| `searchEconomyTransactionNotes` (GET)               | query: `householdId`, `search`, `page?`, `pageSize?` → `SearchTransactionNoteResponse`. Separate from the list filter.                                                                                                                                                                             |
| `attachEconomyTransactionReceipt` (POST, multipart) | path: `transactionId`; body (multipart): `householdId` (text) + `file` (binary) → `AttachReceiptResponse { transactionId, blobContainer, blobKey }`. `422 HttpValidationProblemDetails` on rejection. Generated hook auto-serializes FormData.                                                     |
| `createEconomyTransfer` (POST)                      | body `CreateTransferRequest`: `householdId`, `fromAccountId`, `toAccountId`, `amount: MoneyRequest`, `occurredOn`, `note: null\|string`, `mode: TransferMode`, `categoryId: null\|string`, `payerId: null\|string` → `CreateTransferResponse { transferId, mode, outflow, inflow }`                |
| `getEconomyBudgetSummary` (GET)                     | query: `householdId`, `anchorDate` → `GetBudgetSummaryResponse { budgetId, householdId, periodStartsOn, periodEndsOn, elapsedPercent, lines }`; `BudgetSummaryLineResponse { categoryId, planned, actual, pacePercent, isOverPace }`                                                               |

**Enums:** `TransactionKind = 'Expense' \| 'Income' \| 'Transfer'` · `TransferMode = 'Neutral' \| 'Savings'` (PascalCase) · `AccountType = 'Spending' \| 'Savings'`.

**Key response fields:** `TransactionResponse { transactionId, householdId, accountId, categoryId, amount: MoneyResponse, occurredOn, note, kind, isPending, hasReceipt, payerId }`.

> `MoneyRequest`/`MoneyResponse` = `{ amount: string, currency: Currency }` — always submit `currency: "SEK"`. `pacePercent`, `elapsedPercent`, `minAmount`, `maxAmount`, `page`, `pageSize`, `totalCount` are `number \| string` unions — read/format, never compute. Payer options come from `listHouseholdMembers` (`userId → displayName`); there is no `PayerResponse`.
