# Phase 6 — Analytics · Execution Plan

> Execution detail for **Phase 6** of [`economy-household-frontend-plan.md`](../../economy-household-frontend-plan.md).
> Source-plan goal: _"six display-only chart surfaces using Recharts."_
> Builds on the completed Phase 5 (subscriptions). Prereq: be on a branch off the merged Phase 5.
>
> **Revision note:** unlike Phase 5, there is **no API sync to wait for** — all six analytics
> endpoints and their generated hooks landed with the Phase 5 sync (commit `1f392ae`). Every
> contract point below marked _(verified)_ was confirmed **empirically against the local
> backend on 2026-06-10** with seeded data (categorized + uncategorized transactions, budgets,
> a Savings-mode transfer, and a `cycleStartDay: 15` household), not just read off the spec.

## Status of prerequisites

- ✅ **All six endpoints are in the current snapshot.** `getEconomyCategoryTrend`, `getEconomySpendBreakdown`, `getEconomyPeriodComparison`, `getEconomyIncomeVsExpense`, `getEconomyVarianceHistory`, `getEconomyTopTransactions` — generated `*Options`/`*QueryKey` hooks exist in `api/generated/@tanstack/react-query.gen.ts`. WS0 only **verifies** this; do not run `pnpm api:sync` unless something is missing.
- ✅ **Recharts 3.8.0 is already installed** with the shadcn chart wrapper (`components/ui/chart.tsx`: `ChartContainer`, `ChartTooltip(Content)`, `ChartLegend(Content)`, `ChartConfig`) and a themed 5-color palette (`--chart-1`…`--chart-5` in `app/globals.css`). Use these — no new chart library, no hand-rolled SVG, no hardcoded colors.
- ✅ **Phase 1–5 utilities carry over.** `<Money>`/`formatMoney` (tooltips, legends, list rows), `resolveHouseholdId`, the economy shell/sub-nav, `anchor-date.ts` (server-safe) vs `nuqs-parsers.ts` (client-only) split, `formatEconomyDate`, `addDays` (anchor stepping), the skeletons. **Reuse them.** See [`components/economy/AGENTS.md`](../../components/economy/AGENTS.md).
- ⚠️ **Malformed dates crash the backend.** `from=junk` → **500**, not 422 _(verified)_. The FE owns date validity: every `from`/`to`/`anchorDate` must come from `parseAsAnchorDate`-validated URL state or a server-safe default — never from raw input. `from > to` is safe (200, empty series) and renders as the empty state.
- ⚠️ **Drift noted while probing (not Phase 6 scope, flagged separately):** seeded category names are now **Swedish** (Boende, Mat, Personligt, Sparande, Transport) — AGENTS.md #4 says English; `POST /economy/settings` requires `defaultCurrency`; `GET /economy/budget-summary` can return **404** ("Budget was not found") — AGENTS.md #8 says it documents only a 200.

## How endpoints scope to a household (verified)

All six are GETs under `/v1/economy/analytics/`, scoped by a `householdId` **query param**, membership-gated (no permission strings):

- **category-trend** · **spend-breakdown** · **income-vs-expense** · **variance-history** · **top-transactions**: `householdId` + `from` + `to` (ISO `YYYY-MM-DD`, both required). `top-transactions` adds optional `categoryId` + `limit`.
- **period-comparison**: `householdId` + `anchorDate` (ISO date) — the **only** cycle-aware surface; the backend resolves the containing period from the household's `cycleStartDay`.
- **404 exists only on period-comparison** and means _economy settings missing_ ("Economy settings were not found…") — the economy shell already gates uninitialized households to setup, so this is a race backstop, not a UI state. Data-free anchors return **200 with zero amounts** (`deltaPercent: 0`), not 404 _(verified)_.
- → `householdId` from `useHousehold()`; the page lives under `/h/[slug]/economy/analytics`; server prefetch resolves via `resolveHouseholdId(slug)`.

---

## Resolved contract questions (verified against the local backend — build against these)

1. ✅ **Time-series buckets are calendar months, labeled `"YYYY-MM"` — even when `cycleStartDay ≠ 1`.** Verified with a `cycleStartDay: 15` household: transactions on Jun 10 and Jun 20 both landed in `"2026-06"`. Only **period-comparison** uses the household cycle (its response returned Jun 15–Jul 14 bounds). Don't conflate the two: axis labels for trend/income-vs-expense/variance are month labels; comparison renders the backend's own `currentPeriod*`/`previousPeriod*` dates via `formatPeriodRange`.
2. ✅ **No zero-fill, anywhere.** A 6-month range returned only the 2 months that had transactions; a trend series carries points only for months that category spent in. The FE may **union the labels across series into one shared axis** (presentation reshaping — allowed) but must never fabricate zero-amount points or sum anything. Recharts handles missing datapoints per series (`connectNulls={false}` keeps gaps honest).
3. ✅ **Spend-breakdown = categorized expenses only.** Uncategorized spend is absent from `slices` and `sharePercent` is computed against the categorized total _(verified: slices summed to 1 849 kr while the same range's comparison "spend" was 3 080 kr)_. Never reconcile the donut against other surfaces and never render a client-computed "other" slice. Slices arrive sorted by value desc; `label` currently equals `categoryName` — render `label` (it's the display field).
4. ✅ **Savings allocation appears in the breakdown only.** A `mode: "Savings"` transfer surfaced as a `Sparande` slice (1 500 kr) in spend-breakdown but did **not** count into period-comparison "spend" or income-vs-expense `expense` _(verified)_. This satisfies the source-plan acceptance "savings allocation appears where backend includes it, not recomputed in browser": render the slice as sent; do not add savings into any other chart.
5. ✅ **Period-comparison `series` is a single entry with the literal lowercase label `"spend"`.** Treat the label as an i18n **key** (map `"spend"` → localized copy; fall back to the raw label for future entries), not display text. Fields per entry: `current`/`previous`/`delta` (`MoneyResponse`) + `deltaPercent` (`number | string`).
6. ✅ **Top-transactions is ranked by amount desc across ALL kinds** — an Income salary outranked every expense _(verified)_. Render a `kind` badge per row (reuse the transaction-kind labels); `categoryId`/`categoryName`/`note` are nullable. `limit` is clamped to ≥ 1 server-side (`limit=0` returned one row); **no upper clamp observed** (`limit=99999` returned everything) — the FE always sends an explicit `limit` (default **10**) and never relies on a server default. Optional `categoryId` filters server-side.
7. ✅ **Variance-history needs budgets and reports budgeted categories only.** Months in range with no budget → empty `series` (200, not an error). `planned`/`actual`/`variance` are backend-computed (`variance` = planned − actual; positive = under budget) — render all three, compute none.
8. ✅ **Plotting numbers is a permitted, narrow carve-out from "no money math".** Recharts needs numeric y-values. `Number(money.amount)` / `Number(sharePercent)` / `Number(deltaPercent)` are allowed **only as plot coordinates and display percentages** — never to sum, diff, or derive a value the backend didn't send. Centralize in `toPlotValue(money)` (WS0) so the carve-out is one greppable function; tooltips and axis ticks format through `formatMoney`/`<Money>` so users always see backend-faithful SEK strings.

---

## Global rules (from the source plan — apply throughout)

- **Display-only.** No mutations on this surface at all — no invalidation logic, no forms, no ProblemDetails field mapping (only `handleProblem`-style toast on query error is unnecessary too: failed analytics queries render the error/empty card, they don't toast).
- **Backend series verbatim.** No recomputed aggregates, no fabricated points, no client-derived "other"/total rows. Label-union for shared axes and `toPlotValue` coordinates are the only reshaping allowed (resolved-Q #2/#8).
- **SEK display via `formatMoney`** in tooltips, legends, axis ticks, and the top-transactions list (`<Money>` for DOM rows). Percentages coerce with `Number()` for display only.
- **URL state via `nuqs`** for `?from=`/`?to=` (shared range), `?category=` (top-transactions filter), `?anchor=` (period comparison) — all survive refresh/share (acceptance). Same client-only-parsers / server-safe-defaults split as Phases 2–5 (`AGENTS.md` #9/#14/#34).
- **Honest sparse-data state.** Empty series/slices → an intentional empty card: i18n key rendering **"Not enough data yet"** (the source plan's _"Inte tillräckligt med data än"_ — English catalog now, same honesty; the Swedish string lands with the future `sv` locale). Never render a fake-looking zero chart for missing data.
- **Membership-gated, not permission-string-gated.** No `<Can>` gates.
- **Reads only, prefetched.** Server prefetch all six queries for the **default** range/anchor per ADR 0009; range changes refetch client-side. Charts are client components (`recharts` is browser-only) hydrated from the prefetched cache.
- **Mobile-first.** Single-column stack of chart cards on phones, 2-up grid ≥ `lg`. Fixed-height `ChartContainer`s; the top-transactions surface is a list (rows), not a chart, on all breakpoints. Add `accessibilityLayer` to every Recharts plot (keyboard + screen-reader support).

---

## Routing & shell

One new economy sub-nav entry (**Insights**), one route — six chart cards with shared selectors (no per-chart routes; selectors must stay consistent across charts, and the cards are small):

```
app/(app)/app/h/[slug]/economy/analytics/
└── page.tsx          — six cards: category trend, spend breakdown, period comparison,
                        income vs expense, variance history, top transactions
                        (?from= & ?to= shared · ?category= top-tx filter · ?anchor= comparison)
```

- Add an **analytics** entry to the `tabs` array in `components/economy/economy-shell.tsx` + `economy.shell.nav.analytics` i18n key + `metadata.app.economy.analytics` title.
- New components in `components/economy/`: `analytics-page.tsx` (header + range presets + card grid) and one component per chart — `category-trend-chart.tsx`, `spend-breakdown-chart.tsx`, `period-comparison-card.tsx`, `income-expense-chart.tsx`, `variance-history-chart.tsx`, `top-transactions-card.tsx`. Each owns its query + empty state so one sparse chart never blanks the page.
- Update `components/economy/AGENTS.md` with Phase 6 contract points once stable.

---

## Workstreams (suggested order)

### WS0 — Cross-cutting utilities (build first)

- **Verify** (don't sync): the six `*Options` hooks + response types exist in `api/generated/`. If any are missing, stop and run `pnpm api:sync` against the rebuilt backend as a separate commit (Phase 5 WS0 protocol).
- `lib/economy/analytics.ts` — **server-safe** (no nuqs): `defaultAnalyticsRange(now?)` → `{ from, to }` = first day of the month 5 months back → today (6 calendar months, matching month bucketing); `toPlotValue(money): number` (the resolved-Q #8 carve-out — `Number(amount)`, `NaN`-guarded to `0` with the raw string preserved for tooltips); `formatSeriesMonthLabel("2026-06")` → `"jun 2026"` via the fixed `sv-SE`/UTC convention (falls back to the raw label when not `YYYY-MM` — labels are backend-owned); `DEFAULT_TOP_LIMIT = 10`; `COMPARISON_SERIES_LABEL = "spend"` (lowercase literal). Tests.
- `lib/economy/analytics-filters.ts` — **client-only** nuqs parsers: `from`/`to` (reuse `parseAsAnchorDate` — this is what stands between user input and the backend's 500), `category` (`parseAsString`), `anchor` (`parseAsAnchorDate`). Defaults applied at call sites from the server-safe module (same boundary rule as `subscription-filters.ts`).
- `lib/economy/series.ts` — pure label-union helpers with tests: `unionLabels(series[])` (ordered, deduped) and `pivotTrendSeries(series[])` → `[{ label, [categoryId]: number }]` rows for Recharts. **Reshaping only — must not add points or sum values** (assert in tests).
- Skeletons: `ChartCardSkeleton` (title + fixed-height block) and `RankedListSkeleton` in `economy-skeletons.tsx`.

### WS1 — Route, shell tab, page scaffold (`analytics/page.tsx`)

- Server component: `resolveHouseholdId(slug)` → prefetch **all six** with defaults from `defaultAnalyticsRange()` / `todayAnchorDate()` (`.catch(() => undefined)` each, `Promise.all`), `generateMetadata` from `metadata.app.economy.analytics`.
- `analytics-page.tsx` (client): header + **range control** writing `?from=`/`?to=` — preset chips (3 / 6 / 12 months, server-safe helpers derive the from-date) plus two date inputs for a custom range; card grid (1-col phone → 2-col `lg`). Each card = title + description + chart component behind its own `useQuery` (destructured per AGENTS.md) + `ChartCardSkeleton` while loading + the shared honest empty state when the series is empty.
- Economy shell tab + `economy.shell.nav.analytics` + metadata key land here (page must be reachable for WS2+ verification).

### WS2 — Money-flow charts (income vs expense · variance history)

- **Income vs expense**: grouped `BarChart` (income / expense per month) with a `net` line or third bar — all three values straight off `IncomeVsExpensePointResponse`; x-axis = `formatSeriesMonthLabel(label)`; tooltip via `ChartTooltipContent` formatting with `formatMoney`. Sparse months simply absent (no zero-fill).
- **Variance history**: `LineChart` with `planned` + `actual` lines and the backend's `variance` surfaced in the tooltip (positive = under budget — say so in the tooltip copy). Empty when no budgets in range → empty state pointing at the budget editor.

### WS3 — Category charts (trend · breakdown)

- **Category trend**: multi-line chart over `pivotTrendSeries` rows; one `Line` per `series[]` entry keyed by `categoryId`, color from the `--chart-N` palette cycled via `ChartConfig`, legend = `categoryName`. `connectNulls={false}` so missing months read as gaps, not interpolated spending.
- **Spend breakdown**: donut `PieChart` of `slices` (`toPlotValue(value)` for geometry), legend rows = `label` + `<Money value>` + `Number(sharePercent)`% — shares are backend-computed, never recomputed. No client-added "other"/uncategorized slice (resolved-Q #3); the Savings slice renders like any other (resolved-Q #4).

### WS4 — Period comparison + top transactions

- **Period comparison** (`period-comparison-card.tsx`): `?anchor=` (default `todayAnchorDate()`); render both period ranges via `formatPeriodRange`, a current-vs-previous grouped bar per series entry, and `delta` (`<Money>`) + `Number(deltaPercent)`% chips. Prev/next period steppers derive the adjacent anchor by stepping **one day outside the backend-returned bounds** via `addDays` (the budget-page convention — anchor derivation, not period math). Map the `"spend"` label through i18n with a raw-label fallback (resolved-Q #5). A 404 (settings race) renders the card's empty state, never a toast.
- **Top transactions** (`top-transactions-card.tsx`): ranked rows — rank #, `formatEconomyDate(occurredOn)`, `categoryName` (nullable → "Uncategorized" key), note, `kind` badge (Income included by contract — resolved-Q #6), `<Money amount>`. Always pass `limit: DEFAULT_TOP_LIMIT`. `?category=` filter (select over `listEconomyCategories`, already cached by the shell pages) refetches server-side via the `categoryId` param.

### WS5 — Wiring & docs

- Full `economy.analytics.*` i18n tree (titles, descriptions, tooltip labels, the "Not enough data yet" empty state, preset labels) — chart copy must read as **observed history**, never forecasts (that's the subscriptions surface).
- Add Phase 6 contract points to `components/economy/AGENTS.md` (#35+): calendar-month bucketing vs cycle-aware comparison; no zero-fill + label-union-only reshaping; breakdown excludes uncategorized; savings-slice placement; the `toPlotValue` carve-out; FE-owned date validity (backend 500s on junk); explicit `limit`; `"spend"` label-as-key.
- File the drift follow-ups from "Status of prerequisites" (AGENTS.md #4 seeded names, #8 budget-summary 404) — separate from this phase's changes.

### WS6 — Verification

- `pnpm typecheck` + `pnpm lint` (0 errors) · `pnpm test --run` (range defaults, `toPlotValue` guards, month-label fallback, label-union/pivot purity, parser rejection of junk dates) · `pnpm build` (new route; **nuqs boundary** — `analytics-filters.ts` must never reach the server component; `SESSION_SECRET` required).
- Manual (seed via the API as in Phase 5 — admin `admin@example.test` exists after every backend restart; DB resets on restart): six cards render with rich data; a fresh household shows six intentional empty states; range preset changes update `?from=`/`?to=` and survive refresh; `?category=` narrows top transactions; comparison periods match the household's `cycleStartDay` (test with 15) while trend/income-vs-expense stay calendar-month; the Savings transfer appears **only** as a breakdown slice; junk `?from=` in the URL is dropped by the parser (default range used — no 500 ever reaches the backend); tooltips show `formatMoney` SEK strings; owner and member both see everything.
- `react-doctor` — no score regression; chart series/rows keyed by `categoryId`/`transactionId`/`label`, never array index; every Recharts plot has `accessibilityLayer`.

---

## Acceptance criteria (from the source plan + resolved contract)

- ✅ All six surfaces render on rich data: multi-line trend, breakdown donut, comparison grouped bars, income-vs-expense bars, variance line, ranked top list.
- ✅ Backend series shapes used directly — no recomputed aggregates anywhere (`toPlotValue`/label-union are the only reshaping; greppable).
- ✅ Empty/low-data states look intentional and say "Not enough data yet" (source plan's _"Inte tillräckligt med data än"_, English catalog).
- ✅ URL state (`?from=`/`?to=`/`?category=`/`?anchor=`) drives the selectors and survives refresh.
- ✅ Savings allocation appears where the backend includes it (breakdown slice) and is not recomputed or duplicated into other charts.
- ✅ Malformed date params never reach the backend (parser-validated; the 500 is unreachable from the UI).
- ✅ Owner and member both see all analytics (membership-gated).

---

## Contract appendix — Phase 6 request/response shapes (current snapshot, behaviors verified 2026-06-10)

| Operation                          | Key fields                                                                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getEconomyCategoryTrend` (GET)    | query `{ householdId, from, to }` → `{ series: [{ categoryId, categoryName, points: [{ label: "YYYY-MM", value: MoneyResponse }] }] }` — categories with data only, sparse points, sorted by name                                                  |
| `getEconomySpendBreakdown` (GET)   | query `{ householdId, from, to }` → `{ slices: [{ label, categoryId, categoryName, value: MoneyResponse, sharePercent: number\|string }] }` — categorized expenses only, sorted desc, shares of categorized total; Savings transfers included      |
| `getEconomyPeriodComparison` (GET) | query `{ householdId, anchorDate }` → `{ currentPeriodStartsOn/EndsOn, previousPeriodStartsOn/EndsOn, series: [{ label: "spend", current, previous, delta: MoneyResponse, deltaPercent: number\|string }] }` · `404` ⇔ economy settings missing    |
| `getEconomyIncomeVsExpense` (GET)  | query `{ householdId, from, to }` → `{ series: [{ label: "YYYY-MM", income, expense, net: MoneyResponse }] }` — calendar months with transactions only (no zero-fill)                                                                              |
| `getEconomyVarianceHistory` (GET)  | query `{ householdId, from, to }` → `{ series: [{ label: "YYYY-MM", planned, actual, variance: MoneyResponse }] }` — budgeted months/categories only; empty without budgets                                                                        |
| `getEconomyTopTransactions` (GET)  | query `{ householdId, from, to, categoryId?, limit? }` → `{ transactions: [{ transactionId, occurredOn, categoryId\|null, categoryName\|null, amount, kind, note\|null }] }` — amount desc across all kinds; `limit` clamps to ≥ 1, no upper clamp |

> Money: all values are `MoneyResponse` — render via `formatMoney`/`<Money>`; numeric parsing only through `toPlotValue` for chart coordinates. Percentages (`sharePercent`, `deltaPercent`) coerce with `Number()` for display. Dates: `from`/`to`/`anchorDate` are FE-validated ISO dates — the backend **500s** on malformed input (no 422). `from > to` → 200 empty. Time-series labels are calendar-month strings regardless of `cycleStartDay`; only period-comparison is cycle-aware. There are no analytics-specific error codes — nothing to add to `lib/economy/economy-errors.ts`.
