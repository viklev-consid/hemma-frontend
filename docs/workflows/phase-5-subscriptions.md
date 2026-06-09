# Phase 5 — Subscriptions · Execution Plan

> Execution detail for **Phase 5** of [`economy-household-frontend-plan.md`](../../economy-household-frontend-plan.md).
> Source-plan goal: _"subscription management, calendars, linking. Observe-only."_
> Builds on the completed Phase 4 (CSV import + rules). Prereq: be on a branch off the merged Phase 4.

## Status of prerequisites

- ❌ **BLOCKER: there is no list-subscriptions endpoint.** The contract has `POST /v1/economy/subscriptions` (create), `PUT .../{subscriptionId}/state`, charge-history, link/unlink, payment-schedule, and month-calendar — but **no `GET /v1/economy/subscriptions`** and **no single-subscription GET**. The Subscription Board ("list lifecycle state … change lifecycle state") cannot render from the current contract: `SubscriptionResponse` (with `lifecycleState`, `expectedAmount`, `trialEndsOn`) is only obtainable as a _mutation response_. The payment-schedule response carries only `{ subscriptionId, name, months }` — no state, no amount. **First action of this phase: run `pnpm api:sync` against the backend** (`https://localhost:7297/openapi/v1.json`) to check whether a newer spec adds the list; if it doesn't, flag the gap to backend and **build WS2–WS4 first** (they're list-independent) while the board (WS1) waits. Do not synthesize a board from the schedule response — it can't show state and would misrepresent the contract.
- ✅ **Everything else is in the generated client.** `createEconomySubscription`, `changeEconomySubscriptionLifecycleState`, `getEconomySubscriptionChargeHistory`, `linkEconomySubscriptionTransaction`, `unlinkEconomySubscriptionTransaction`, `getEconomySubscriptionPaymentSchedule`, `getEconomySubscriptionMonthCalendar` (+ matching `*Mutation` / `*Options` / `*QueryKey` hooks).
- ✅ **Closed-domain enums are typed — and the match enum is lowercase.** `SubscriptionLifecycleState = 'Trial' | 'Active' | 'Paused' | 'Cancelled'` (PascalCase, like every other enum) but `SubscriptionMatchState = 'actual' | 'predicted' | 'suggested'` (**lowercase** — the source plan's "verify exact generated-client enum/string values before coding conditionals" is hereby verified; don't pattern-match the PascalCase habit). Plus `zSubscriptionLifecycleState` / `zSubscriptionMatchState` / `zCadenceFrequency` for validation.
- ⚠️ **The month calendar has NO backend monthly total.** `MonthChargeCalendarResponse` is `{ month, days: MonthChargeDayResponse[] }` — nothing else. The source plan's "Monthly total from backend" cannot be satisfied, and the no-money-math rule forbids summing `days[].charges[].amount` client-side. **Either the backend adds a `total` field or the UI omits the total** — flag to backend alongside the list endpoint; do not sum in the browser.
- ✅ **Cadence is monthly-only, same as recurring bills.** `CadenceFrequency = 'Monthly'`; `CreateSubscriptionRequest` carries `cadenceInterval` (int) + `chargeDay` (`number | string`). Reuse `lib/economy/cadence.ts` (`cadenceIntervalOptions` 1–12, `cadenceDayOptions` 1–28, `formatCadence`). ⚠️ `chargeDay` has no domain bound in zod (bare int32) — assume the 1–28 day rule (it must exist in every month, same as `cadenceDayOfMonth`); backend 422 is the backstop.
- ✅ **Phase 1–4 utilities carry over.** `<Money>` / `formatMoney` / `toMoneyRequest`, `flattenCategories` (not needed here — subscriptions carry no category), `resolveHouseholdId`, the economy shell/sub-nav, `parseAsAnchorDate` + `anchor-date.ts` (the month param **is** an anchor date — see below), `formatEconomyDate`, the account picker (`listEconomyAccounts` — `accountId` on a subscription is nullable/optional), and the skeletons. **Reuse them.** See [`components/economy/AGENTS.md`](../../components/economy/AGENTS.md).
- ✅ **Phase 4 left the door open deliberately.** The import preview renders a display-only "matches subscription" hint (`suggestedSubscriptionMatches`, Phase 4 open-Q #10). Phase 5 owns link/unlink — see open-Q #7 for whether the import wizard gains a link affordance (recommendation: no; keep linking centralized in the subscription surfaces).

## How endpoints scope to a household (verified)

- **Create** (`POST /v1/economy/subscriptions`): `householdId` in the **body** (`CreateSubscriptionRequest`) → `201 SubscriptionResponse`.
- **Change state** (`PUT .../subscriptions/{subscriptionId}/state`): `subscriptionId` is a **path param**; body is `ChangeLifecycleStateRequest { householdId, lifecycleState, trialEndsOn }` → `200 SubscriptionResponse`.
- **Charge history** (`GET .../subscriptions/{subscriptionId}/charge-history`): `subscriptionId` is a **path param**; `householdId` + optional `page` + `pageSize` are **query params**.
- **Link** (`POST .../subscriptions/{subscriptionId}/link`): path `subscriptionId`; body `LinkTransactionRequest { householdId, transactionId }` → `200 TransactionResponse`.
- **Unlink** (`POST .../subscriptions/{subscriptionId}/unlink`): same shape as link (the body type is also `LinkTransactionRequest`) → `200 TransactionResponse`.
- **Payment schedule** (`GET .../subscriptions/payment-schedule`): query `householdId` + `year` (`number | string`).
- **Month calendar** (`GET .../subscriptions/month-calendar`): query `householdId` + `month` — and `month` is validated as `z.iso.date()`, i.e. a **full `YYYY-MM-DD` date**, not `YYYY-MM`. It's an anchor date inside the target month — exactly the budget `anchorDate` pattern, so `?month=` reuses `parseAsAnchorDate` / `todayAnchorDate` and the prev/next stepping convention.
- → The FE always sources `householdId` from `useHousehold()`. All Phase 5 screens live under `/h/[slug]/economy/subscriptions/...`. Server prefetch resolves it via `resolveHouseholdId(slug)`.

---

## Open questions — resolve before / during build

1. ❌ **Where does the board's data come from?** No list endpoint (see blocker above). Resolution order: (a) `pnpm api:sync` — the backend may have shipped `GET /v1/economy/subscriptions` since the spec snapshot; (b) if absent, request it from backend (response should be `{ subscriptions: SubscriptionResponse[] }`) and sequence WS1 last; (c) never derive the board from payment-schedule rows. Everything below that says "list" assumes (a) or (b) has landed; write the invalidation helper against a `listEconomySubscriptionsQueryKey` you expect to exist.
2. ✅ **Match state semantics — three states, two homes.** `actual` = a confirmed link (a real `TransactionResponse` behind it). `suggested` = backend-proposed match, rendered distinctly with a one-click **link** affordance. `predicted` = a forecast with **no** transaction — it appears in the **month calendar** (`MonthChargeResponse.transactionId: null | string`) but ⚠️ `ChargeHistoryItemResponse.transactionId` is typed **non-null** `string`, which implies predicted rows don't appear in charge history (history = actual + suggested). Verify against real data; if predicted rows do arrive in history with an empty-string id, flag the contract.
3. ✅ **Charge history is paginated; counts are `number | string`.** `ChargeHistoryResponse { subscriptionId, charges[], priceChanges[], page, pageSize, total }` — coerce `page`/`pageSize`/`total` with `Number()` for display/page-count only (same as Phase 2's `totalCount`). URL state: `?chargePage=` + `?chargePageSize=` via `nuqs` (acceptance: pagination survives refresh). `page`/`pageSize` are optional in the query — verify the backend defaults (assume 1 / 20; make the FE default explicit in a server-safe constant).
4. ✅ **Price changes are backend-derived.** `priceChanges: PriceChangeResponse[] { changedOn, previousAmount, newAmount }` rides along on the charge-history response. Render "99 kr → 119 kr" via two `<Money>`s + `formatEconomyDate(changedOn)` — no diffing, no math, no client derivation. (Acceptance: "Price change such as 99 → 119 is visible.")
5. ⚠️ **`trialEndsOn` coupling to `Trial`.** Both `CreateSubscriptionRequest` and `ChangeLifecycleStateRequest` carry `trialEndsOn: null | string`. Presumably required when `lifecycleState = 'Trial'` and ignored/null otherwise — the form shows the date input only when Trial is selected and submits `null` otherwise; the backend 422 (keyed `TrialEndsOn` → standard mapper) is authoritative. Verify whether changing state _away_ from Trial requires explicitly nulling it.
6. ⚠️ **Are all lifecycle transitions legal?** The contract types any `SubscriptionLifecycleState` into the change-state body. Is `Cancelled → Active` allowed? `Trial → Paused`? The UI should offer all states and let the 422 backstop reject illegal moves **unless** verification shows a transition matrix — in which case trim affordances (UI trims, backend enforces, as with role escalation). Start permissive; tighten after testing against the real backend.
7. ✅ **Import-wizard linking stays out of scope.** Phase 4's preview hint stays display-only. Linking lives in the subscription surfaces (charge history rows + month calendar). Upgrading the import hint to a link button would put a second link path inside a wizard mid-flight — defer unless product asks.
8. ⚠️ **Manual link needs a transaction picker — scope it minimally.** "Manual link/unlink works" (source plan). Unlink: a button on `actual` rows → `unlinkEconomySubscriptionTransaction` with that row's `transactionId`. Link: one-click on `suggested` rows (the suggestion **is** the transaction). A free-form "link any transaction" picker (search `listEconomyTransactions`, pick, link) is the long tail — build the suggested-row + unlink paths first, then add the picker as a small follow-on inside the same charge-history surface (a dialog listing recent unlinked transactions for the subscription's account). Don't block the phase on picker polish.
9. ✅ **A subscription never posts money — invalidation is narrow.** This **inverts** the Phase 3/4 pattern: link/unlink/create/change-state move **no** money, so do **not** invalidate account balances or budget summaries. Invalidate: the subscriptions list (once it exists) + payment schedule + month calendar on create/change-state; charge history (that subscription) + month calendar on link/unlink. `TransactionResponse` carries no subscription field, so the transactions list doesn't render link state — no need to invalidate it (verify: if the backend later adds a linked badge to transactions, revisit).
10. ✅ **Year schedule months are plain month numbers.** `SubscriptionPaymentScheduleResponse { subscriptionId, name, months: (number | string)[] }` — coerce with `Number()`, render a 12-cell row per subscription with charge months filled ("Monthly fills all months; every-6-month cadence marks two"). The backend computes which months — the FE never projects cadence into months itself.

---

## Global rules (from the source plan — apply throughout)

- **Observe-only money.** A subscription **never** posts money (source-plan backend behavior #1). No UI path may imply a charge books a transaction: copy reads "expected"/"predicted", the create form's `expectedAmount` is labeled as an expectation, and there is no "pay"/"charge now" affordance anywhere. Linking marks an _existing_ transaction as belonging to a subscription — it does not create or move anything.
- **SEK-only, no money math.** `expectedAmount` enters via `<MoneyInput>` + `toMoneyRequest` (stamps SEK). All displayed amounts (`expectedAmount`, charge amounts, price changes) render via `<Money>`. No client-side totals — including the month calendar (see the missing-total blocker). Counts/paging coerce with `Number()` for display only.
- **Membership-gated, not permission-string-gated.** Owner and member both manage subscriptions and link/unlink. No `<Can>` / permission gates.
- **Forms:** TanStack Forms + generated Zod (`zCreateSubscriptionRequest`, `zChangeLifecycleStateRequest`, `zLinkTransactionRequest`) + the ProblemDetails mapper. No per-form error handling.
- **Reads:** server prefetch + hydration per ADR 0009 — payment schedule (current year) and month calendar (current month anchor) prefetch in their pages; the board prefetches the list once it exists; charge history is client-fetched on expand (it's behind a per-subscription interaction, not first paint).
- **URL state:** `nuqs` for `?year=`, `?month=` (an ISO anchor date — reuse `parseAsAnchorDate`), `?subscription=` (the expanded charge-history target), `?chargePage=`, `?chargePageSize=`. Same client-only-nuqs / server-safe-constants split as Phases 2–4 (`AGENTS.md` #9/#14): server prefetch must not import the nuqs parser module.
- **Copy:** English i18n (`messages/en/economy.json`), keys not literals; lifecycle/match-state labels keyed by the exact enum strings (mind the lowercase match states).
- **Mobile-first.** The year schedule is a 12-column grid — horizontally scrollable on phone. The month calendar is a day grid on desktop, a charge-list-by-day stack on phone (CSS breakpoints, no `useIsMobile`). Board and charge history are phone-first cards/rows.

---

## Routing & shell

One new economy sub-nav entry (**Subscriptions**) with three surfaces. Board is the tab target; the calendars are siblings reachable from a small in-page nav (board ↔ year ↔ month):

```
app/(app)/app/h/[slug]/economy/subscriptions/
├── page.tsx          — board: list + create + change state; charge history expands per
│                       subscription (?subscription= & ?chargePage= & ?chargePageSize=)
├── year/page.tsx     — year payment calendar (?year=)
└── month/page.tsx    — month charge calendar (?month= ISO anchor date)
```

- Add a **subscriptions** entry to the `tabs` array in `components/economy/economy-shell.tsx` + `economy.shell.nav.subscriptions` i18n key + `metadata.app.economy.subscriptions` / `subscriptionsYear` / `subscriptionsMonth` titles. (The shell's `isActive` prefix-match lights the tab for all three routes.)
- Charge history lives **inside the board route** (expandable panel/sheet keyed by `?subscription=`) rather than a `[subscriptionId]` page, because there is no single-subscription GET — a standalone detail page couldn't render its own header without the list. Revisit if a GET-by-id ships.
- New components in `components/economy/` (`subscriptions-board.tsx`, `subscription-form.tsx`, `charge-history-panel.tsx`, `payment-schedule-page.tsx`, `month-calendar-page.tsx`). Update `components/economy/AGENTS.md` with Phase 5 contract points once stable.

---

## Workstreams (suggested order)

### WS0 — Contract sync + cross-cutting utilities (build first)

- **Run `pnpm api:sync`.** If `listEconomySubscriptions` (or equivalent) appears: regenerate, commit, unblock WS1. If not: file the backend gap (list endpoint + month-calendar `total`) and reorder WS1 last.
- `lib/economy/subscription.ts` — `SUBSCRIPTION_LIFECYCLE_STATE` and `SUBSCRIPTION_MATCH_STATE` constants (`as const satisfies Record<…>`, mirroring `RECURRING_BILL_TYPE`; **note the lowercase match values**), plus small predicates the UI branches on (`isLinkable(state) → state === 'suggested'`, `isUnlinkable → 'actual'`). Tests.
- `lib/economy/subscription-calendar.ts` — server-safe helpers: `currentYear()` (derived from `todayAnchorDate()`, no `Date` locale traps), month-number → label via `Intl` with the fixed `sv-SE`/UTC convention from `period.ts`, `DEFAULT_CHARGE_PAGE_SIZE = 20`. **No nuqs here.** Tests.
- `lib/economy/subscription-filters.ts` — **client-only** nuqs parsers: `?year=` (`parseAsInteger` with a sane floor/ceiling), `?month=` (re-export `parseAsAnchorDate` usage), `?subscription=` (`parseAsString`), `?chargePage=` / `?chargePageSize=` (`parseAsInteger.withDefault`). Same boundary rule as `transaction-filters.ts`.
- Skeletons: a board-row skeleton, a 12-cell schedule-row skeleton, a month-grid skeleton in `economy-skeletons.tsx`.

### WS1 — Subscription board (`subscriptions/page.tsx`) — ⚠️ blocked on the list endpoint

- List via the (new) list options; server-prefetch for first paint. Each card: name, `formatCadence`-style label (interval + `chargeDay`), `<Money expectedAmount>`, lifecycle **state badge** (`Trial` shows `trialEndsOn`), optional account name, `startsOn`.
- **Create** dialog: TanStack form → `createEconomySubscriptionMutation`, validated with `zCreateSubscriptionRequest`. Fields: name, expectedAmount (`<MoneyInput>`), cadenceInterval (1–12), chargeDay (1–28, reuse `cadenceDayOptions`), lifecycleState (default `Active`; picking `Trial` reveals a required `trialEndsOn` date), optional account, startsOn (default today). Copy must not imply money movement ("expected amount", never "will charge").
- **Change state**: per-card state menu → `changeEconomySubscriptionLifecycleStateMutation` (`{ path: { subscriptionId }, body: { householdId, lifecycleState, trialEndsOn } }`). Offer all four states until open-Q #6 yields a transition matrix; map 422s through the standard mapper.
- On create/change-state success: invalidate the list + payment-schedule + month-calendar keys (predicate-match the calendar keys by `householdId` across `month`/`year` params, mirroring the budget-summary predicate pattern). **No balance/budget invalidation** (open-Q #9).

### WS2 — Year payment calendar (`year/page.tsx`)

- `?year=` via nuqs (default `currentYear()`); prev/next year steppers. Server component prefetches `getEconomySubscriptionPaymentSchedule({ query: { householdId, year } })` for the default year only (the param default must come from the server-safe module).
- Render one row per `subscriptions[]` entry: name + 12 month cells, filled where `months` (Number-coerced) contains that month. Backend computes the months — render-only. Empty schedule → friendly empty state pointing at "create a subscription".

### WS3 — Month charge calendar (`month/page.tsx`)

- `?month=` is an **ISO anchor date** via `parseAsAnchorDate.withDefault(todayAnchorDate())`; prev/next month steppers derive the adjacent anchor (reuse `addDays` against the backend-returned `month`/day range, or step the anchor by setting day 1 ∓ 1 day — anchor derivation, not period math).
- Prefetch current month server-side; render `days[]` as a day grid (desktop) / stacked day list (phone). Each charge chip: name, `<Money>`, and a **match-state distinction** — `actual` (solid/linked), `predicted` (muted/outline, explicitly labeled a forecast), `suggested` (accent + link affordance, see WS4). Day cells render only what the backend sent — no client filling of empty days beyond layout.
- **No monthly total** until the backend provides one (blocker note). Leave a clearly-keyed slot in the layout + i18n so adding `total` later is a one-liner.

### WS4 — Charge history + linking (inside the board)

- Expanding a board card (or following `?subscription=`) loads `getEconomySubscriptionChargeHistoryOptions({ path: { subscriptionId }, query: { householdId, page, pageSize } })` with `?chargePage=`/`?chargePageSize=` from the URL (defaults 1 / `DEFAULT_CHARGE_PAGE_SIZE`). Render compact prev/next pagination from `Number(total)` / `Number(pageSize)`; pagination state survives refresh by construction (acceptance).
- Rows: `formatEconomyDate(occurredOn)`, `<Money amount>`, note, match-state badge. `actual` rows get **Unlink** (confirm-lite; `unlinkEconomySubscriptionTransactionMutation` with the row's `transactionId`); `suggested` rows get **Link** (`linkEconomySubscriptionTransactionMutation`, same body shape). Both return a `TransactionResponse` — ignore beyond success/error handling.
- **Price changes**: render `priceChanges[]` above or beside the list — "`<Money previous>` → `<Money new>` (date)". This is the "99 → 119 visible" acceptance row.
- Manual "link another transaction" picker (open-Q #8): a dialog listing recent transactions (existing `listEconomyTransactions` infinite query, filtered to the subscription's account when set) with a per-row Link action. Build after the suggested/unlink paths work end-to-end.
- On link/unlink success: invalidate that subscription's charge-history key + the month-calendar keys (predicate by `householdId`). Nothing else (open-Q #9).

### WS5 — Wiring

- Economy shell tab + i18n (`economy.shell.nav.subscriptions`, the full `economy.subscriptions.*` tree) + `metadata.app.economy.subscriptions*` titles.
- Add Phase 5 contract points to `components/economy/AGENTS.md` (the lowercase match enum, the no-list-endpoint history, the narrow-invalidation inversion, the `?month=` anchor-date reuse, observe-only copy rules).

### WS6 — Verification

- `pnpm typecheck` + `pnpm lint` (0 errors) · `pnpm test --run` (subscription constants/predicates, calendar helpers, parser defaults) · `pnpm build` (three new routes; **watch the nuqs boundary** — `subscription-filters.ts` must never reach a server component; `pnpm build` needs `SESSION_SECRET`).
- Manual: create a subscription → it appears on the board and the year schedule; switch month in the URL → calendar updates and the URL survives refresh; a `suggested` charge links with one click and flips to `actual`; unlink reverses it; a price change renders as old → new; charge-history page 2 survives a hard refresh; **no surface anywhere implies a subscription charges an account**; owner and member can both do all of it.
- `react-doctor` — no score regression; key calendar cells and history rows by stable ids (`subscriptionId`, `transactionId`, `date`), never array index. `permission-review` N/A (membership-gated).

---

## Acceptance criteria (from the source plan)

- ✅ No UI path implies a subscription charges an account (observe/link only; "expected"/"predicted" copy).
- ✅ Month changes update the URL (`?month=` anchor date via `nuqs`) and survive refresh.
- ✅ A price change such as 99 → 119 is visible (backend-derived `priceChanges[]`, rendered via `<Money>`).
- ✅ Charge history pagination works and survives refresh (`?chargePage=`/`?chargePageSize=`, backend `page`/`pageSize`/`total` metadata).
- ✅ Suggested matches render distinctly from confirmed actual links; manual link/unlink works.
- ✅ Year schedule shows backend-computed charge months (monthly = all 12; every-6-months = two).
- ✅ Owner and member can both manage subscriptions and link/unlink (membership-gated).

---

## Contract appendix — Phase 5 request/response shapes (from generated client)

| Operation                                       | Key fields                                                                                                                                                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createEconomySubscription` (POST)              | body `CreateSubscriptionRequest { householdId, name, cadenceFrequency: 'Monthly', cadenceInterval, chargeDay, expectedAmount: MoneyRequest, lifecycleState, trialEndsOn, accountId, startsOn }` → `201 SubscriptionResponse` |
| `changeEconomySubscriptionLifecycleState` (PUT) | path `subscriptionId`; body `ChangeLifecycleStateRequest { householdId, lifecycleState, trialEndsOn }` → `200 SubscriptionResponse`                                                                                          |
| `getEconomySubscriptionChargeHistory` (GET)     | path `subscriptionId`; query `{ householdId, page?, pageSize? }` → `ChargeHistoryResponse { subscriptionId, charges[], priceChanges[], page, pageSize, total }`                                                              |
| `linkEconomySubscriptionTransaction` (POST)     | path `subscriptionId`; body `LinkTransactionRequest { householdId, transactionId }` → `200 TransactionResponse`                                                                                                              |
| `unlinkEconomySubscriptionTransaction` (POST)   | path `subscriptionId`; body `LinkTransactionRequest` (same shape) → `200 TransactionResponse`                                                                                                                                |
| `getEconomySubscriptionPaymentSchedule` (GET)   | query `{ householdId, year }` → `PaymentScheduleResponse { year, subscriptions: [{ subscriptionId, name, months: (number\|string)[] }] }`                                                                                    |
| `getEconomySubscriptionMonthCalendar` (GET)     | query `{ householdId, month: ISO date (anchor) }` → `MonthChargeCalendarResponse { month, days: [{ date, charges: MonthChargeResponse[] }] }` — **no total field**                                                           |
| `listEconomySubscriptions` (GET)                | **❌ does not exist in the current spec** — see blocker; expected `{ subscriptions: SubscriptionResponse[] }`                                                                                                                |

**Enums:** `SubscriptionLifecycleState = 'Trial' \| 'Active' \| 'Paused' \| 'Cancelled'` (PascalCase) · `SubscriptionMatchState = 'actual' \| 'predicted' \| 'suggested'` (**lowercase**) · `CadenceFrequency = 'Monthly'`.

**Key response shapes:**

- `SubscriptionResponse { subscriptionId, householdId, name, cadenceFrequency, cadenceInterval, chargeDay: number|string, expectedAmount: MoneyResponse, lifecycleState, trialEndsOn: null|string, accountId: null|string, startsOn }`
- `ChargeHistoryItemResponse { transactionId: string (non-null — predicted likely absent from history, open-Q #2), occurredOn, amount: MoneyResponse, note, matchState }`
- `PriceChangeResponse { changedOn, previousAmount: MoneyResponse, newAmount: MoneyResponse }`
- `MonthChargeResponse { subscriptionId, name, amount: MoneyResponse, matchState, transactionId: null|string }`
- `SubscriptionMatchSuggestionResponse { subscriptionId, name, matchState, expectedAmount }` (appears on Phase 4 import rows — display-only there, per open-Q #7)

> Money: all amounts are `MoneyRequest`/`MoneyResponse` (no raw scalars, unlike import rows). Counts and paging (`page`, `pageSize`, `total`, `chargeDay`, `year`, `months[]`) are `number | string` — coerce with `Number()`, never compute. The month-calendar `month` query param is a full **ISO anchor date** (`z.iso.date()`), resolved to a month backend-side — reuse the budget-period anchor convention. There is **no** list-subscriptions endpoint, **no** single-subscription GET, **no** delete-subscription, and **no** month-calendar total in the current spec — the first two block the board (see prerequisites); never fill the gaps client-side.
