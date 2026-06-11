# Economy module — frontend contract crib sheet

UI for the backend **Economy** module (Phase 1: setup, accounts, categories,
budget; Phase 2: transactions, receipts, transfers, budget pace; Phase 3:
recurring bills + confirmation inbox; Phase 4: CSV import wizard +
categorization rules). Built per
`docs/workflows/phase-1-economy-core.md`,
`docs/workflows/phase-2-transactions-receipts-transfers.md`,
`docs/workflows/phase-3-recurring-bills.md`, and
`docs/workflows/phase-4-csv-import-rules.md`. Records the non-obvious contract
points so an agent walking in cold makes correct calls.

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
| cadence label + interval/day options (1–12 / 1–28)      | `lib/economy/cadence.ts`               |
| recurring enums + `confirmableOccurrences` (inbox src)  | `lib/economy/recurring-bill.ts`        |
| CSV parse seam (PapaParse), browser-only                | `lib/economy/csv-parse.ts`             |
| import field-length limits + `IMPORT_MAX_ROWS`          | `lib/economy/import-field-limits.ts`   |
| column→field mapping (`applyMapping`, `guessMapping`)   | `lib/economy/import-mapping.ts`        |
| rule/import enums, rule cap, `duplicateChip`            | `lib/economy/categorization-rule.ts`   |
| `?step=` nuqs parser, **client-only**                   | `lib/economy/import-step.ts`           |
| import-step names (server-safe, no nuqs)                | `lib/economy/import-step-constants.ts` |
| analytics defaults + `toPlotValue`/labels, server-safe  | `lib/economy/analytics.ts`             |
| analytics `?from=/?to=/?anchor=/?category=`, **client** | `lib/economy/analytics-filters.ts`     |
| label-union / trend pivot (reshaping only, pure)        | `lib/economy/series.ts`                |

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

## Phase 3 contract points

### 16. One list query feeds both the bills list and the confirmation inbox

`listEconomyRecurringBills` returns `recurringBills[]`, each carrying
`pendingOccurrences[]` + `nextDueOn`. There is **no** separate occurrence
endpoint, **no** single-bill GET, and **no** history — pending occurrences are
all that exist in the contract (don't build a timeline). The inbox is derived
client-side via `confirmableOccurrences(bills)`, not fetched. Render it only
when non-empty, above the list, in `recurring-bills-page.tsx`.

### 17. The confirmable set = `Estimated` bills' occurrences with `transactionId != null`

`confirmableOccurrences` gates on a **non-null `transactionId`** (the robust
check — you can't confirm an occurrence with no posted transaction). Confirm via
`confirmEconomyEstimatedBillMutation({ path: { recurringBillId }, body: {
householdId, transactionId, amount: toMoneyRequest(real), occurredOn } })` — the
`transactionId` comes from the occurrence, default the amount input to the
estimate. It returns a `TransactionResponse`; on success the confirmed
occurrence drops out of the inbox after the list refetch.

### 18. Occurrence actions target the occurrence's own `dueOn` — never a picker

skip / pause / resume all take `{ path: { recurringBillId }, body: {
householdId, dueOn } }` where `dueOn` is the occurrence's **own** value. There
is **no date picker** on these actions (the "no future-date drift" guard).
Offer **resume** only on a `Paused` occurrence; **skip/pause** on
`Pending`/`Posted`. Skipping one occurrence must not visually alter the rest of
the schedule — trust the backend's returned `nextDueOn` and other occurrences.

### 19. No edit, no delete

The client has only list / create / confirm / skip / pause / resume. There is
**no** update-bill or delete-bill operation — don't invent one; flag to product
if editing is needed.

### 20. Cadence is monthly-only; label-only, no schedule math

`cadenceFrequency` is `'Monthly'` (render fixed, no picker). `cadenceInterval`
is 1–12 and `cadenceDayOfMonth` is 1–28 (`cadence.ts`; reuses the cycle 1–28
bound — the day must exist in every month). `formatCadence` builds a label
only; the backend owns `nextDueOn`. Out-of-range → 422 via the standard mapper.
`formatCadence` takes a translator callback typed to a literal `CadenceMessageKey`
union so next-intl's typed keys accept the dynamic `cadence.${key}` lookup.

### 21. Confirm/occurrence changes book real transactions — invalidate broadly

A confirm (and occurrence state changes) can settle a real transaction and shift
balances + budget actuals. `recurring-bills-page.tsx` invalidates the recurring
list **plus** transactions, account balances, and every budget-summary period
for the household (predicate match — same pattern as `transfer-form.tsx`), not
just the bills list.

## Phase 4 contract points

### 22. Import is JSON, parsed in the browser — there is no upload endpoint

The browser parses the CSV (`parseCsv` → PapaParse, isolated in
`csv-parse.ts`) and submits **normalized rows** as JSON. `previewEconomyImport`
and `commitEconomyImport` both carry `rows: NormalizedImportRowRequest[]` plus
`householdId` + `accountId` in the **body**. The "field mapping" step is purely
client-side (`applyMapping`): it maps CSV columns onto the row fields, stamps
`currency: "SEK"` and a 1-based `rowNumber`, and leaves `categoryId: null`
(rules auto-apply server-side). Row `amount` is a raw scalar (normalized to a
decimal string via `normalizeMoneyAmount`), **not** a `MoneyRequest`;
`balanceAfter` IS a `MoneyRequest`.

### 23. The browser never computes duplicates, categories, or totals

`previewEconomyImport` returns per-row `duplicateState` (`None | Exact |
Possible`), `selectedCategoryId` (rules-applied), `suggestedCategoryId`,
`rowFingerprint`, and `errors[]`. The duplicate chip folds `Exact`/`Possible`
into "dup", `None` → "new" (`duplicateChip`). The preview defaults to
**excluding** `Exact` duplicates (re-includable) **and** rows with
`errors[]` — commit stays blocked while an included row has errors (the
backend would fail the whole batch with no per-row guidance). Key preview
rows by `rowNumber` (the stable 1-based source row) — **not**
`rowFingerprint`, which is content-derived and collides on identical rows
(the exact duplicate case this screen handles), and not the array index.

### 24. `previewFingerprint` is the double-commit guard — pass it through verbatim

Commit echoes the **exact** `previewFingerprint` from the preview it derives
from. Never mint or mutate it client-side. There is **no** import-history /
list-imports endpoint — import is a stateless preview→commit. A commit books
real transactions, so it invalidates the transactions list, account balances,
and every budget-summary period for the household (predicate match — same
pattern as `transfer-form` / `recurring-bills-page`).

### 25. The rule enabled-cap is client-derived; the backend is authoritative

There is **no** server `enabledCount`/`cap` field. Compute
`enabledRuleCount(rules)` / `isAtRuleCap(rules)` for the "X / 100 enabled" badge
and to disable create + enable-toggle at the cap (toggling **off** stays
allowed). `RULE_ENABLED_CAP = 100` is a UI constant; a mismatch must fail toward
the backend's 422, not this number. ⚠️ The rule path param is `ruleId`, **not**
`categorizationRuleId` (the response field).

### 26. Match is `Contains | Regex`; Regex never runs in the browser

`Contains` is the default; `Regex` sits behind an "Advanced" toggle. Regex
compile/timeout failures come back as 422 keyed to `pattern` and map through
`api/problems.ts` — there is **no** client-side regex evaluation or timeout
logic. Commit's `suggestedRules` are offered as one-click "save as rule",
filtered client-side against existing rules (match+pattern+target) so duplicates
aren't suggested.

### 27. Wizard step + account live in the URL; parsed rows + preview do not

The import wizard is **one** route with internal `?step=` (`upload | map |
preview | done`) + `?accountId=` panels, both `nuqs` (navigation-survival is an
acceptance criterion — unlike the Phase 1 setup wizard's local `useState`). The
parsed rows and preview response are too large for the URL → component state;
the `preview`/`done` steps guard and bounce back to `upload` when that in-memory
state is gone (e.g. hard refresh). Field-length limits
(`validateImportRow`) and the `IMPORT_MAX_ROWS = 1000` cap are client-checked
before preview; the backend 422 is the backstop (never silently drop rows).
Subscription-match hints on preview rows are display-only — linking is Phase 5.

## Phase 5 contract points

### 28. The match-state enum is lowercase; lifecycle is PascalCase

`SubscriptionMatchState = 'actual' | 'predicted' | 'suggested'` — lowercase,
unlike every other backend enum. Don't pattern-match the PascalCase habit;
branch via `SUBSCRIPTION_MATCH_STATE` from `lib/economy/subscription.ts`.
Semantics are pinned: charge history is **`actual` only**, `predicted` exists
only in the month calendar, `suggested` only on import-preview rows
(post-import suggestions come from the link-candidates endpoint instead).

### 29. Subscription intervals are 1–24 — do NOT reuse the bills' helper

`cadenceIntervalOptions()` (bills) is 1–12; subscriptions use
`subscriptionIntervalOptions()` (1–24) from `lib/economy/subscription.ts`.
`chargeDay` shares the 1–28 bound (`subscriptionChargeDayOptions` delegates to
`cadenceDayOptions`).

### 30. `Cancelled` is terminal, kept, and date-stamped only post-deploy

No DELETE exists — cancelled subscriptions persist by design (linked actuals
and old calendar months reference them) and the list endpoint is the only read
surface that returns them (payment-schedule and month-calendar exclude them
from _predictions_; their actuals still render). State controls are hidden
entirely on cancelled cards; the create form never offers `Cancelled` (422).
`cancelledOn` is `null` for pre-deploy cancellations → bare "Cancelled" badge,
dated badge otherwise. `trialEndsOn` is a **required nullable key** in both
create and change-state bodies: required date when targeting `Trial`, send
`null` otherwise (the server nulls it unconditionally on non-Trial states).

### 31. Month-calendar day placement is the backend's, verbatim

Actuals appear on the transaction's **real date** (`days[].date`), not the
scheduled `chargeDay`; a linked actual replaces that month's predicted entry
(no double counting); multiple actuals all render; cancelled/off-cycle actuals
still appear. Render only what `days[]` says — no client-side day math, gap
filling, or projecting cadence into months (the year schedule's `months[]` is
also backend-computed). `actualTotal`/`predictedTotal` are backend-summed and
never combined client-side. The `?month=` param is a full ISO **anchor date**
(`parseAsAnchorDate`), not `YYYY-MM`.

### 32. Linking is candidates-first; the 409 has a dedicated branch

Link flow opens with the link-candidates endpoint (same heuristic as import
suggestions; unlinked only, ≤10, 12-month lookback); empty → manual picker
over recent transactions with non-null-`subscriptionId` rows greyed.
Same-subscription relink is an idempotent 200 (double-click safe).
Cross-subscription link → `409 Economy.Transaction.AlreadyLinked`
(`ECONOMY_ERRORS.TransactionAlreadyLinked` in `lib/economy/economy-errors.ts`)
→ dedicated "unlink it first" toast **before** the `handleProblem` fallback;
moving a charge = unlink, then relink. Charge-history pagination renders from
the **echoed** `page`/`pageSize`/`total` (the server clamps silently;
`Number()`-coerce for display only).

### 33. Subscription invalidation is narrow — the inverse of #21

Subscriptions never post money: **never** invalidate balances or budget
summaries. Create/change-state → subscriptions list + payment schedule + month
calendar. Link/unlink → that subscription's charge history + link candidates +
month calendar **+ the transactions list** (rows render a linked badge from
`TransactionResponse.subscriptionId`). Helpers live in
`subscription-invalidation.ts`. Copy throughout is observe-only: "expected" /
"predicted", and no UI path may imply a subscription charges an account.

### 34. Subscription URL state splits server-safe vs client-only (same rule as #9)

`subscription-calendar.ts` (defaults: `currentYear()`, paging constants,
month labels) is server-safe and feeds page prefetches;
`subscription-filters.ts` (nuqs parsers for `?year=`, `?month=`,
`?subscription=`, `?chargePage=`, `?chargePageSize=`) is client-only. Year /
month defaults are applied at the call site with `.withDefault(...)` so they
reflect render time.

## Phase 6 contract points (Insights / analytics)

Six **display-only** chart surfaces at `/h/[slug]/economy/analytics`
(`analytics-page.tsx` + one component per chart, all behind `ChartCard` in
`analytics-card.tsx`). No mutations, no invalidation, no `<Can>` (membership-
gated). Built per `docs/workflows/phase-6-analytics.md`; behaviors verified
against the local backend 2026-06-10.

### 35. Two server/client split modules (same rule as #9 / #34)

`lib/economy/analytics.ts` is **server-safe** (range defaults, `toPlotValue`,
`formatPlotMoney`, `formatSeriesMonthLabel`, `DEFAULT_TOP_LIMIT`,
`COMPARISON_SERIES_LABEL`) and feeds the page prefetch.
`lib/economy/analytics-filters.ts` (nuqs parsers for `?from=`/`?to=`/`?anchor=`
/`?category=`) is **client-only** — never import it from the server page.
`lib/economy/series.ts` (`unionLabels`, `pivotTrendSeries`) is pure.

### 36. Calendar-month buckets vs. period-aware surfaces — don't conflate

**Trend** and **income-vs-expense** are labeled `"YYYY-MM"` **calendar** months
regardless of `cycleStartDay`; render via `formatSeriesMonthLabel`.

**Variance-history is NOT strict calendar-month.** It labels by the **budget-
period start month** (`"YYYY-MM"`), so for a `cycleStartDay ≠ 1` household it's
_budget-period history_, not calendar buckets — verified with a cycle-15
household: a `Mat` transaction on **Apr 12** landed under the **`"2026-03"`**
bucket (the period that starts Mar 15). For cycle day 1 it happens to coincide
with calendar months. Same `formatSeriesMonthLabel` for display, but don't tell
users these are calendar months. (This corrected an earlier wrong claim that
lumped variance with the calendar-month surfaces.)

**Period-comparison is fully cycle-aware** — it takes `?anchor=` and the backend
resolves the containing period from `cycleStartDay`; render its own
`currentPeriod*`/`previousPeriod*` bounds via `formatPeriodRange`. Prev/next
steppers derive the adjacent anchor with `addDays` one day outside the returned
bounds (#7 convention).

### 37. No zero-fill; label-union + `toPlotValue` are the only reshaping

The backend ships sparse series (only months/categories with data). Never
fabricate a zero point or sum/derive a value. `series.ts` may union labels into
a shared axis and pivot the trend response into rows; `<Line connectNulls=
{false}>` keeps missing months as honest gaps. `toPlotValue(money)` (the single
greppable carve-out) supplies numeric **plot coordinates only** — every visible
amount still formats through `formatMoney`/`<Money>`/`formatPlotMoney`.

### 38. Breakdown excludes uncategorized; savings shows only here

Spend-breakdown `slices` are categorized expenses only; `sharePercent` is the
backend's share of the **categorized** total — render it, never recompute, and
never add a client "other"/uncategorized slice (resolved-Q #3). A `Savings`-mode
transfer surfaces as a breakdown slice **and nowhere else** — it must not be
added into period-comparison spend or income-vs-expense (resolved-Q #4).

### 39. FE owns date validity — the backend 500s on junk

A malformed `from`/`to`/`anchorDate` → **500**, not 422. Every date must come
from a `parseAsAnchorDate`-validated param or a server-safe default; the parser
dropping a junk `?from=` to its `.withDefault(...)` is what keeps the 500
unreachable. `from > to` is safe (200, empty series → empty card).

### 40. Period-comparison `"spend"` is a label-as-key; top-tx `limit` is explicit

The comparison `series` is a single entry labeled lowercase `"spend"` — map it
through i18n (`COMPARISON_SERIES_LABEL`) with a raw-label fallback, don't render
it raw. A data-free anchor returns 200 with zero amounts (not 404) → treat
all-zero as the empty state. Top-transactions is ranked desc across **all**
kinds (Income included); always send `limit: DEFAULT_TOP_LIMIT` (no upper clamp,
no reliable server default); `categoryName`/`note` are nullable.

### 41. Chart colors bypass `ChartConfig` for backend-keyed series

`components/ui/chart.tsx`'s `ChartStyle` injects raw CSS from `ChartConfig`
keys — so for series keyed by backend ids (category-trend lines, breakdown
slices) set the color directly via `stroke`/`fill` from `chartColor(index)` and
give `ChartConfig` entries only a `label`. Never pass a category id/name as a
config color key.

### 42. Per-category drill-down: `variance-history?categoryId=` + actual fallback

`variance-history` takes an optional `categoryId` — when present, `planned`/
`actual`/`variance` are scoped to that one budget category (omit → aggregate,
unchanged). Clicking a category in the trend legend or breakdown
(legend row / slice) opens `category-detail-dialog.tsx` (transient, **not**
URL-persisted — it's a drill-down, not a view). The dialog shows that category's
planned-vs-actual; if it isn't budgeted in range the series is empty (200) and
it **falls back to the actual trend** from the cached `category-trend` so a click
never opens an empty dialog. Inherits #36: the budgeted view's buckets are
budget-period months (the dialog says so), the fallback is calendar months.
⚠️ Budget lines are upserted via **`PUT /economy/budgets/lines`** (`POST` → 405).

## Forms

TanStack Forms + generated Zod (`zCreateEconomySettingsRequest`,
`zCreateAccountRequest`, `zAddCategoryRequest`, `zUpsertBudgetLineRequest`,
`zCreateRecurringBillRequest`, `zConfirmEstimatedBillRequest`,
`zCategorizationRuleRequest`, `zPreviewImportRequest`, `zCommitImportRequest`,
`zCreateSubscriptionRequest`, `zChangeLifecycleStateRequest`,
`zLinkTransactionRequest`)

- the ProblemDetails mapper (`api/problems.ts`). No per-form error handling.
  After scope-changing mutations, invalidate the relevant economy query keys
  (and balances/accounts together on account create).

## When you change anything here

Run `pnpm typecheck`, `pnpm lint`, `pnpm test --run`, and `pnpm build` (routing

- server/client boundaries — the nuqs boundary in #9 is build-only).
  `permission-review` is **N/A** unless you add a `<Can>`/permission guard
  (economy is membership-gated). Note `pnpm build` requires `SESSION_SECRET` set
  (see `.env.example`).
