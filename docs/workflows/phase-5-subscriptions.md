# Phase 5 — Subscriptions · Execution Plan

> Execution detail for **Phase 5** of [`economy-household-frontend-plan.md`](../../economy-household-frontend-plan.md).
> Source-plan goal: _"subscription management, calendars, linking. Observe-only."_
> Builds on the completed Phase 4 (CSV import + rules). Prereq: be on a branch off the merged Phase 4.
>
> **Revision note:** the two original blockers (no list endpoint, no month total) and all open
> contract questions were resolved with backend in June 2026. The backend has shipped the
> additions described below; **the repo's `openapi.json` snapshot predates them** — WS0's first
> action is `pnpm api:sync` against the rebuilt backend, committed separately before any UI work.

## Status of prerequisites

- ✅ **List + detail endpoints shipped (sync required).** `GET /v1/economy/subscriptions?householdId=` → `ListSubscriptionsResponse { subscriptions: SubscriptionResponse[] }`, sorted by name, **including cancelled** — the list is the only read surface where cancelled subscriptions appear (payment-schedule and month-calendar exclude cancelled from _predictions_). `GET .../subscriptions/{subscriptionId}?householdId=` → `200 SubscriptionResponse` / `404`. The board is unblocked.
- ✅ **Link-candidates endpoint shipped (sync required).** `GET .../subscriptions/{subscriptionId}/link-candidates?householdId=` → `{ subscriptionId, candidates: [{ transactionId, occurredOn, amount, note }] }`. Same heuristic as import suggestions (literally shared code): transaction note contains the subscription name (case-insensitive), occurs within ±3 days of the charge day in a month the cadence actually charges, amount within max(5 kr, 10% of expected). Only **unlinked** transactions, 12-month lookback (never before `startsOn`), capped at 10, newest first. Empty array → fall back to the manual picker.
- ✅ **`TransactionResponse.subscriptionId: guid | null` shipped (sync required)** — on every surface that returns transactions (list, record, link/unlink responses). Enables linked badges, greying linked rows in the picker, and client-side double-link prevention.
- ✅ **Month calendar totals + day semantics fixed (sync required).** `MonthChargeCalendarResponse` is now `{ month, days[], actualTotal: MoneyResponse, predictedTotal: MoneyResponse }` — both summed server-side, forecasts separate from real spend. Render both; never sum client-side. Day-placement contract: see open-Q #2.
- ✅ **Link semantics are now specified.** Linking a transaction already linked to the **same** subscription → idempotent `200`. Already linked to a **different** subscription → `409` with error code `Economy.Transaction.AlreadyLinked` (moving a charge = unlink, then relink). This replaced an unspecified silent link-steal. Map the 409 to a dedicated message ("already linked to another subscription — unlink it first") via an error-code constant, not an inline string.
- ✅ **`cancelledOn: string | null` (date) shipped (sync required)** on `SubscriptionResponse` — set when a subscription enters `Cancelled`. ⚠️ Subscriptions cancelled **before** the backend deploy have `cancelledOn: null` — render "Cancelled {date}" when present, a bare "Cancelled" badge otherwise. There is **no** `DELETE` — keeping cancelled subscriptions is intentional (linked actuals and the calendar reference them).
- ✅ **Closed-domain enums are typed — and the match enum is lowercase.** `SubscriptionLifecycleState = 'Trial' | 'Active' | 'Paused' | 'Cancelled'` (PascalCase) but `SubscriptionMatchState = 'actual' | 'predicted' | 'suggested'` (**lowercase** — don't pattern-match the PascalCase habit). Plus `zSubscriptionLifecycleState` / `zSubscriptionMatchState` / `zCadenceFrequency` for validation.
- ✅ **Cadence is monthly-only — but the interval bound differs from bills.** `CadenceFrequency = 'Monthly'` (anything else 422s). `chargeDay` is **1–28** (confirmed; reuse `cadenceDayOptions`). ⚠️ `cadenceInterval` is **1–24** for subscriptions — recurring bills are 1–12, so `cadenceIntervalOptions()` from `lib/economy/cadence.ts` must NOT be reused blindly; subscriptions need their own options (or a parameterized helper).
- ✅ **Phase 1–4 utilities carry over.** `<Money>` / `formatMoney` / `toMoneyRequest`, `resolveHouseholdId`, the economy shell/sub-nav, `parseAsAnchorDate` + `anchor-date.ts` (the month param **is** an anchor date — see below), `formatEconomyDate`, the account picker (`accountId` on a subscription is nullable/optional), and the skeletons. **Reuse them.** See [`components/economy/AGENTS.md`](../../components/economy/AGENTS.md).
- ✅ **Phase 4's import hint stays display-only.** The import preview renders "matches subscription" (`suggestedSubscriptionMatches`) with no link affordance. Phase 5 centralizes linking in the subscription surfaces (open-Q #7).

## How endpoints scope to a household (verified)

- **List** (`GET /v1/economy/subscriptions`): `householdId` is a **query param** → `200 ListSubscriptionsResponse`. Sorted by name; includes cancelled.
- **Get by id** (`GET .../subscriptions/{subscriptionId}`): path `subscriptionId`; query `householdId` → `200 SubscriptionResponse` / `404`.
- **Create** (`POST /v1/economy/subscriptions`): `householdId` in the **body** (`CreateSubscriptionRequest`) → `201 SubscriptionResponse`. ⚠️ Cannot create as `Cancelled` (422).
- **Change state** (`PUT .../subscriptions/{subscriptionId}/state`): path `subscriptionId`; body `ChangeLifecycleStateRequest { householdId, lifecycleState, trialEndsOn }` → `200 SubscriptionResponse`.
- **Charge history** (`GET .../subscriptions/{subscriptionId}/charge-history`): path `subscriptionId`; query `householdId` + optional `page` + `pageSize`.
- **Link candidates** (`GET .../subscriptions/{subscriptionId}/link-candidates`): path `subscriptionId`; query `householdId`.
- **Link** (`POST .../subscriptions/{subscriptionId}/link`): path `subscriptionId`; body `LinkTransactionRequest { householdId, transactionId }` → `200 TransactionResponse` · `409 Economy.Transaction.AlreadyLinked` when linked to another subscription · idempotent `200` when re-linking to the same one.
- **Unlink** (`POST .../subscriptions/{subscriptionId}/unlink`): same body shape as link → `200 TransactionResponse`.
- **Payment schedule** (`GET .../subscriptions/payment-schedule`): query `householdId` + `year` (`number | string`). Predictions only — excludes cancelled.
- **Month calendar** (`GET .../subscriptions/month-calendar`): query `householdId` + `month` — `month` is validated as `z.iso.date()`, i.e. a **full `YYYY-MM-DD` date**, not `YYYY-MM`. It's an anchor date inside the target month — exactly the budget `anchorDate` pattern, so `?month=` reuses `parseAsAnchorDate` / `todayAnchorDate` and the prev/next stepping convention.
- → The FE always sources `householdId` from `useHousehold()`. All Phase 5 screens live under `/h/[slug]/economy/subscriptions/...`. Server prefetch resolves it via `resolveHouseholdId(slug)`.

---

## Resolved contract questions (answers from backend — build against these)

1. ✅ **Board data = the list endpoint.** Includes cancelled subscriptions (the only surface that has them). Show cancelled in a collapsed/muted section rather than hiding — hiding would make a cancelled subscription invisible everywhere except old calendar actuals. Never derive the board from payment-schedule rows.
2. ✅ **Match-state semantics — corrected and pinned.** Charge history rows are **`actual` only** (`transactionId` non-null there is correct). `predicted` exists **only** in the month calendar (`MonthChargeResponse.transactionId` nullable). `suggested` exists only on **import-preview** rows — it never appears in history or the calendar; post-import suggestions come from the **link-candidates endpoint** instead. Month-calendar day placement: actuals appear on the transaction's **real date**, not the scheduled `chargeDay` (a charge scheduled for the 15th but posted the 13th shows on the 13th — never assume `chargeDay` placement; always use `days[].date`). When a subscription has a linked actual in the month, its predicted entry is **removed** (no double counting, in days or totals). Multiple actuals for one subscription all appear, each on its own day. Actuals on cancelled/off-cycle subscriptions still appear (real money is never dropped); only predictions are limited to non-cancelled, scheduled-that-month subscriptions.
3. ✅ **Paging: defaults `page=1, pageSize=50`; silent clamp to page ≥ 1, pageSize 1–100 (no 422).** The response echoes the **effective** `page`/`pageSize` — trust those for rendering pagination, not the request params. Coerce `page`/`pageSize`/`total` with `Number()` for display/page-count only. URL state: `?chargePage=` + `?chargePageSize=` via `nuqs`.
4. ✅ **Price changes are backend-derived.** `priceChanges: PriceChangeResponse[] { changedOn, previousAmount, newAmount }` rides on the charge-history response. Render "99 kr → 119 kr" via two `<Money>`s + `formatEconomyDate(changedOn)` — no diffing, no math.
5. ✅ **`trialEndsOn` coupling:** required when `lifecycleState = 'Trial'` (422 otherwise), on both create and change-state. When changing **away** from Trial, do **not** send `trialEndsOn: null` — the server nulls it unconditionally. On create with a non-Trial state, a stray `trialEndsOn` is silently discarded. The form shows the date input only when Trial is selected.
6. ✅ **Transition matrix: `Cancelled` is terminal; everything else is legal**, including back into Trial. Any change-state call on a cancelled subscription fails. UI: disable state controls entirely when state is `Cancelled`; offer all four states otherwise. The **create** form must not offer `Cancelled` (backend 422s it).
7. ✅ **Import-wizard linking stays out of scope.** The Phase 4 preview hint remains display-only; linking lives in the subscription surfaces. (Link-candidates uses the same matching code, so the two surfaces are behaviorally consistent.)
8. ✅ **Linking design: candidates-first, picker as fallback.** Open the link flow with `link-candidates`; each candidate row gets a one-click **Link**. Empty candidates → show the manual picker (recent transactions via `listEconomyTransactions`, filtered to the subscription's account when set, **greying rows whose `subscriptionId` is non-null**). Unlink: button on `actual` charge-history rows. Same-subscription relink is an idempotent 200 (double-click safe); cross-subscription returns `409 Economy.Transaction.AlreadyLinked` → dedicated message via the error-code constant, with unlink-then-relink as the documented remedy. The 409 remains the backstop for races even with client-side greying.
9. ✅ **Invalidation — narrow but now includes transactions.** Subscriptions never post money, so **never** invalidate balances or budget summaries. Create/change-state: invalidate the subscriptions list + payment schedule + month calendar. Link/unlink: invalidate that subscription's charge history + link-candidates + month calendar **+ the transactions list** — `TransactionResponse.subscriptionId` is now renderable there (linked badge), so the original "skip transactions" guidance no longer holds.
10. ✅ **Year schedule months are plain month numbers.** `SubscriptionPaymentScheduleResponse { subscriptionId, name, months: (number | string)[] }` — coerce with `Number()`, render a 12-cell row per subscription. The backend computes which months; the FE never projects cadence into months itself.

---

## Global rules (from the source plan — apply throughout)

- **Observe-only money.** A subscription **never** posts money. No UI path may imply a charge books a transaction: copy reads "expected"/"predicted", and there is no "pay"/"charge now" affordance. Linking marks an _existing_ transaction as belonging to a subscription — it creates and moves nothing.
- **SEK-only, no money math.** `expectedAmount` enters via `<MoneyInput>` + `toMoneyRequest`. All amounts (expected, charges, price changes, `actualTotal`/`predictedTotal`) render via `<Money>` — no client-side sums, ever. Counts/paging coerce with `Number()` for display only.
- **Membership-gated, not permission-string-gated.** Owner and member both manage subscriptions and link/unlink. No `<Can>` / permission gates.
- **Forms:** TanStack Forms + generated Zod (`zCreateSubscriptionRequest`, `zChangeLifecycleStateRequest`, `zLinkTransactionRequest`) + the ProblemDetails mapper. The 409 link conflict is the one case with a dedicated branch — by error-code constant, before the generic toast fallback.
- **Reads:** server prefetch + hydration per ADR 0009 — the board prefetches the list; payment schedule (current year) and month calendar (current month anchor) prefetch in their pages; charge history and link candidates are client-fetched on expand (behind a per-subscription interaction, not first paint).
- **URL state:** `nuqs` for `?year=`, `?month=` (ISO anchor date — reuse `parseAsAnchorDate`), `?subscription=` (the expanded charge-history target), `?chargePage=`, `?chargePageSize=`. Same client-only-nuqs / server-safe-constants split as Phases 2–4 (`AGENTS.md` #9/#14).
- **Copy:** English i18n (`messages/en/economy.json`); lifecycle/match-state labels keyed by the exact enum strings (mind the lowercase match states).
- **Mobile-first.** Year schedule = horizontally scrollable 12-column grid on phone. Month calendar = day grid on desktop, charge-list-by-day stack on phone (CSS breakpoints, no `useIsMobile`). Board, candidates, and charge history are phone-first cards/rows.

---

## Routing & shell

One new economy sub-nav entry (**Subscriptions**) with three surfaces; a small in-page nav links board ↔ year ↔ month:

```
app/(app)/app/h/[slug]/economy/subscriptions/
├── page.tsx          — board: list + create + change state + cancelled section;
│                       charge history & linking expand per subscription
│                       (?subscription= & ?chargePage= & ?chargePageSize=)
├── year/page.tsx     — year payment calendar (?year=)
└── month/page.tsx    — month charge calendar (?month= ISO anchor date)
```

- Add a **subscriptions** entry to the `tabs` array in `components/economy/economy-shell.tsx` + `economy.shell.nav.subscriptions` i18n key + `metadata.app.economy.subscriptions` / `subscriptionsYear` / `subscriptionsMonth` titles. (The shell's `isActive` prefix-match lights the tab for all three routes.)
- Charge history stays **inside the board route** (expandable panel/sheet keyed by `?subscription=`). The new get-by-id endpoint would support a `[subscriptionId]` detail page, but the panel design needs one fewer route and the list is prefetched anyway — revisit only if the panel outgrows itself.
- New components in `components/economy/` (`subscriptions-board.tsx`, `subscription-form.tsx`, `charge-history-panel.tsx`, `link-transaction-dialog.tsx`, `payment-schedule-page.tsx`, `month-calendar-page.tsx`). Update `components/economy/AGENTS.md` with Phase 5 contract points once stable.

---

## Workstreams (suggested order)

### WS0 — API sync + cross-cutting utilities (build first)

- **Run `pnpm api:sync` against the rebuilt backend** and commit the regenerated client separately. Verify the new surface landed: `listEconomySubscriptions`, `getEconomySubscription`, `getEconomySubscriptionLinkCandidates` (names may vary — check `sdk.gen.ts`), `TransactionResponse.subscriptionId`, `MonthChargeCalendarResponse.actualTotal`/`predictedTotal`, `SubscriptionResponse.cancelledOn`.
- `lib/economy/subscription.ts` — `SUBSCRIPTION_LIFECYCLE_STATE` and `SUBSCRIPTION_MATCH_STATE` constants (`as const satisfies Record<…>`; **lowercase match values**), `isTerminal(state)` (`Cancelled`), subscription-specific `subscriptionIntervalOptions()` (**1–24**, NOT the bills' 1–12 helper), `chargeDay` reuses `cadenceDayOptions` (1–28). Tests.
- `lib/economy/economy-errors.ts` — error-code constants for codes the UI branches on, starting with `ECONOMY_ERRORS.TransactionAlreadyLinked = "Economy.Transaction.AlreadyLinked"` (mirror the `lib/household-errors.ts` pattern: const catalog + predicate helper). Tests.
- `lib/economy/subscription-calendar.ts` — server-safe helpers: `currentYear()` (derived from `todayAnchorDate()`), month-number → label via `Intl` with the fixed `sv-SE`/UTC convention from `period.ts`, `DEFAULT_CHARGE_PAGE_SIZE = 50` (matches the backend default; the response's echoed values stay authoritative). **No nuqs.** Tests.
- `lib/economy/subscription-filters.ts` — **client-only** nuqs parsers: `?year=` (`parseAsInteger`, sane bounds), `?month=` (reuse `parseAsAnchorDate`), `?subscription=` (`parseAsString`), `?chargePage=` / `?chargePageSize=` (`parseAsInteger.withDefault`). Same boundary rule as `transaction-filters.ts`.
- Skeletons: board-row, 12-cell schedule-row, month-grid, candidates-row in `economy-skeletons.tsx`.

### WS1 — Subscription board (`subscriptions/page.tsx`)

- List via `listEconomySubscriptions` options; server-prefetch for first paint. Active/Trial/Paused cards first; **cancelled subscriptions in a collapsed, muted section** — "Cancelled {formatEconomyDate(cancelledOn)}" when the date is present, bare "Cancelled" badge when `null` (pre-deploy cancellations).
- Each card: name, cadence label (interval 1–24 + `chargeDay`), `<Money expectedAmount>`, lifecycle badge (`Trial` shows `trialEndsOn`), optional account name, `startsOn`.
- **Create** dialog: TanStack form → `createEconomySubscriptionMutation` + `zCreateSubscriptionRequest`. Fields: name, expectedAmount, cadenceInterval (1–24), chargeDay (1–28), lifecycleState (**Trial | Active | Paused only — never Cancelled**; default `Active`; Trial reveals required `trialEndsOn`), optional account, startsOn (default today). Copy must not imply money movement.
- **Change state**: per-card state menu → `changeEconomySubscriptionLifecycleStateMutation`. **Hidden/disabled entirely on cancelled cards** (terminal). All four target states offered otherwise; selecting Trial requires a `trialEndsOn` date; leaving Trial sends `trialEndsOn: null`-free body (server nulls it).
- On create/change-state success: invalidate list + payment-schedule + month-calendar keys (predicate-match calendar keys by `householdId` across params). **No balance/budget invalidation.**

### WS2 — Year payment calendar (`year/page.tsx`)

- `?year=` via nuqs (default `currentYear()`); prev/next steppers. Server prefetch for the default year (param default from the server-safe module).
- One row per `subscriptions[]` entry: name + 12 month cells, filled where `Number()`-coerced `months` contains that month. Predictions only (no cancelled). Empty → friendly empty state pointing at "create a subscription".

### WS3 — Month charge calendar (`month/page.tsx`)

- `?month=` via `parseAsAnchorDate.withDefault(todayAnchorDate())`; prev/next month steppers derive the adjacent anchor (anchor derivation, not period math).
- Prefetch current month server-side; render `days[]` as a day grid (desktop) / stacked day list (phone). Charge chips distinguish `actual` (solid, linked) vs `predicted` (muted/outline, labeled a forecast). Render **only** what `days[].date` says — actuals sit on real transaction dates, not `chargeDay`; an actual replaces its month's predicted entry; cancelled-subscription actuals still appear. No client-side day math or filling.
- **Totals header:** `<Money actualTotal>` + `<Money predictedTotal>`, clearly labeled (e.g. "Spent" / "Expected") — backend-summed, never client-added. No combined total (deliberate: real spend stays separate from forecast).

### WS4 — Charge history + linking (inside the board)

- Expanding a board card (or `?subscription=`) loads `getEconomySubscriptionChargeHistory` with `?chargePage=`/`?chargePageSize=` from the URL. Render prev/next pagination from the **echoed** `page`/`pageSize`/`total` (`Number()`-coerced) — the server clamps silently, so the response is the truth. Pagination survives refresh by construction (acceptance).
- History rows are **all `actual`**: `formatEconomyDate(occurredOn)`, `<Money amount>`, note, and an **Unlink** button (`unlinkEconomySubscriptionTransactionMutation` with the row's `transactionId`).
- **Link flow — candidates first:** a "Link a charge" affordance fetches `link-candidates`. Each candidate: date, `<Money>`, note, one-click **Link**. Empty candidates → fall through to the **manual picker** (`link-transaction-dialog.tsx`): recent transactions from `listEconomyTransactions` (filtered to the subscription's account when set), rows with non-null `subscriptionId` greyed with a "linked" hint. Honest helper copy for candidates ("matched by name, date, and amount").
- **Link errors:** same-subscription relink is an idempotent 200 — treat as success. `409` with `ECONOMY_ERRORS.TransactionAlreadyLinked` → dedicated toast ("already linked to another subscription — unlink it first"); everything else falls through to `handleProblem`.
- **Price changes**: render `priceChanges[]` above the list — "`<Money previous>` → `<Money new>` ({date})". This is the "99 → 119 visible" acceptance row.
- On link/unlink success: invalidate that subscription's charge-history + link-candidates keys, the month-calendar keys, **and the transactions list** (its rows now carry `subscriptionId`). No balances/budget.

### WS5 — Wiring

- Economy shell tab + i18n (`economy.shell.nav.subscriptions`, the full `economy.subscriptions.*` tree) + `metadata.app.economy.subscriptions*` titles.
- Optional, cheap: a subtle linked-subscription badge on Phase 2's transaction list rows (`subscriptionId != null`) — the data is already there; defer if it grows beyond a badge.
- Add Phase 5 contract points to `components/economy/AGENTS.md`: lowercase match enum; history = actual-only; candidates-first linking + 409 semantics; the 1–24 vs 1–12 interval split; day-placement rules; the narrow-invalidation inversion (+ transactions-list exception); `cancelledOn` null fallback; observe-only copy rules.

### WS6 — Verification

- `pnpm typecheck` + `pnpm lint` (0 errors) · `pnpm test --run` (subscription constants/predicates, error-code catalog, calendar helpers, parser defaults) · `pnpm build` (three new routes; **watch the nuqs boundary** — `subscription-filters.ts` must never reach a server component; `SESSION_SECRET` required).
- Manual: create a subscription → appears on board + year schedule; cancelled section shows date (or bare badge for pre-deploy rows); state menu absent on cancelled cards; month in URL survives refresh; an actual posted off-schedule renders on its real date and suppresses that month's prediction; totals match backend values; link-candidates one-click works, empty state falls back to the picker with linked rows greyed; cross-subscription link shows the dedicated 409 message; unlink-then-relink moves a charge; price change renders old → new; charge-history page 2 survives refresh; **no surface implies a subscription charges an account**; owner and member can both do all of it.
- `react-doctor` — no score regression; key calendar cells/history rows/candidates by stable ids (`subscriptionId`, `transactionId`, `date`), never array index. `permission-review` N/A (membership-gated).

---

## Acceptance criteria (from the source plan + resolved contract)

- ✅ No UI path implies a subscription charges an account (observe/link only; "expected"/"predicted" copy).
- ✅ Month changes update the URL (`?month=` anchor date via `nuqs`) and survive refresh.
- ✅ A price change such as 99 → 119 is visible (backend-derived `priceChanges[]`, rendered via `<Money>`).
- ✅ Charge history pagination works and survives refresh (echoed `page`/`pageSize`/`total` are authoritative).
- ✅ Link candidates render distinctly and link with one click; manual link (picker) and unlink work; cross-subscription conflicts surface the dedicated 409 message.
- ✅ Month calendar shows backend `actualTotal` + `predictedTotal`; actuals on real dates; no double counting with predictions.
- ✅ Year schedule shows backend-computed charge months (monthly = all 12; every-6-months = two).
- ✅ Cancelled subscriptions are visible (with `cancelledOn` when available), terminal, and excluded from predictions.
- ✅ Owner and member can both manage subscriptions and link/unlink (membership-gated).

---

## Contract appendix — Phase 5 request/response shapes (post-sync)

| Operation                                       | Key fields                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `listEconomySubscriptions` (GET)                | query `householdId` → `ListSubscriptionsResponse { subscriptions: SubscriptionResponse[] }` — sorted by name, includes cancelled                                                                                                                       |
| `getEconomySubscription` (GET)                  | path `subscriptionId`; query `householdId` → `200 SubscriptionResponse` / `404`                                                                                                                                                                        |
| `createEconomySubscription` (POST)              | body `CreateSubscriptionRequest { householdId, name, cadenceFrequency: 'Monthly', cadenceInterval: 1–24, chargeDay: 1–28, expectedAmount: MoneyRequest, lifecycleState (≠ Cancelled), trialEndsOn, accountId, startsOn }` → `201 SubscriptionResponse` |
| `changeEconomySubscriptionLifecycleState` (PUT) | path `subscriptionId`; body `ChangeLifecycleStateRequest { householdId, lifecycleState, trialEndsOn }` → `200` · fails on cancelled subscriptions (terminal)                                                                                           |
| `getEconomySubscriptionChargeHistory` (GET)     | path `subscriptionId`; query `{ householdId, page?, pageSize? }` (defaults 1/50, clamp 1–100, echoed values authoritative) → `ChargeHistoryResponse { charges[] (actual only), priceChanges[], page, pageSize, total }`                                |
| `getEconomySubscriptionLinkCandidates` (GET)    | path `subscriptionId`; query `householdId` → `{ subscriptionId, candidates: [{ transactionId, occurredOn, amount, note }] }` — unlinked only, ≤10, 12-month lookback, newest first                                                                     |
| `linkEconomySubscriptionTransaction` (POST)     | path `subscriptionId`; body `LinkTransactionRequest { householdId, transactionId }` → `200 TransactionResponse` · same-sub relink = idempotent 200 · `409 Economy.Transaction.AlreadyLinked` (other sub)                                               |
| `unlinkEconomySubscriptionTransaction` (POST)   | path `subscriptionId`; body `LinkTransactionRequest` → `200 TransactionResponse`                                                                                                                                                                       |
| `getEconomySubscriptionPaymentSchedule` (GET)   | query `{ householdId, year }` → `PaymentScheduleResponse { year, subscriptions: [{ subscriptionId, name, months: (number\|string)[] }] }` — predictions only, excludes cancelled                                                                       |
| `getEconomySubscriptionMonthCalendar` (GET)     | query `{ householdId, month: ISO date (anchor) }` → `MonthChargeCalendarResponse { month, days[], actualTotal: MoneyResponse, predictedTotal: MoneyResponse }`                                                                                         |

**Enums:** `SubscriptionLifecycleState = 'Trial' \| 'Active' \| 'Paused' \| 'Cancelled'` (PascalCase; Cancelled terminal) · `SubscriptionMatchState = 'actual' \| 'predicted' \| 'suggested'` (**lowercase**; `suggested` is import-preview-only) · `CadenceFrequency = 'Monthly'`.

**Error codes:** `Economy.Transaction.AlreadyLinked` (409 on link) — catalog in `lib/economy/economy-errors.ts`.

**Key response shapes:**

- `SubscriptionResponse { subscriptionId, householdId, name, cadenceFrequency, cadenceInterval, chargeDay: number|string, expectedAmount: MoneyResponse, lifecycleState, trialEndsOn: null|string, cancelledOn: null|string (null for pre-deploy cancellations), accountId: null|string, startsOn }`
- `TransactionResponse` now carries `subscriptionId: null|string` on **every** surface returning transactions.
- `ChargeHistoryItemResponse { transactionId: string (non-null — history is actual-only), occurredOn, amount: MoneyResponse, note, matchState }`
- `PriceChangeResponse { changedOn, previousAmount: MoneyResponse, newAmount: MoneyResponse }`
- `MonthChargeResponse { subscriptionId, name, amount: MoneyResponse, matchState: 'actual'|'predicted', transactionId: null|string }`

> Money: all amounts are `MoneyRequest`/`MoneyResponse`. Counts and paging (`page`, `pageSize`, `total`, `chargeDay`, `year`, `months[]`) are `number | string` — coerce with `Number()`, never compute. The month-calendar `month` query param is a full **ISO anchor date** resolved to a month backend-side. Candidates heuristic (shared with import suggestions): name-contains (case-insensitive) + ±3 days of charge day in a cadence-charged month + amount within max(5 kr, 10% of expected). There is **no** `DELETE` — cancelled subscriptions persist by design; never fill contract gaps client-side.
