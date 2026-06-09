# Phase 4 — CSV Import Wizard + Rules Manager · Execution Plan

> Execution detail for **Phase 4** of [`economy-household-frontend-plan.md`](../../economy-household-frontend-plan.md).
> Source-plan goal: _"multi-step import flow and categorization rules."_
> Builds on the completed Phase 3 (recurring bills). Prereq: be on a branch off the merged Phase 3.

## Status of prerequisites

- ✅ **Import + rules API is in the generated client.** All Phase 4 operations exist and are typed: `previewEconomyImport`, `commitEconomyImport`, `listEconomyCategorizationRules`, `createEconomyCategorizationRule`, `updateEconomyCategorizationRule`, `deleteEconomyCategorizationRule`, `setEconomyCategorizationRuleEnabled` (+ matching `*Mutation` / `*Options` / `*QueryKey` hooks).
- ✅ **Closed-domain enums are typed.** `CategorizationRuleMatch = 'Contains' | 'Regex'`, `ImportDuplicateState = 'None' | 'Exact' | 'Possible'`, `Currency = 'SEK'` — plus `zCategorizationRuleMatch` / `zImportDuplicateState` / `zCurrency` for validation.
- ✅ **Import is JSON, not a file upload.** `PreviewImportRequest` / `CommitImportRequest` carry `rows: NormalizedImportRowRequest[]` — the browser parses the CSV locally and submits normalized rows as JSON. **There is no import file-upload / multipart endpoint** (unlike Phase 2 receipts). "Field mapping" is a client-side column→field mapping step; the backend never sees the raw file.
- ✅ **Money stays single-typed.** Row `amount` is the raw scalar (`null | number | string`) with `currency` as a sibling field (always `"SEK"`); `balanceAfter` is a `MoneyRequest`/`MoneyResponse`. Counts (`importedCount`, `duplicateCount`) come back as `number | string` — coerce with `Number()` for display, same as the Phase 2 transactions list does for `totalCount`.
- ✅ **Phase 1–3 utilities are reusable.** `lib/economy/money.ts` (`formatMoney`, `toMoneyRequest`, `isValidMoneyAmount`), `components/economy/money.tsx` (`<Money>`, `<MoneyInput>`), `lib/economy/category-tree.ts` (`flattenCategories`), `lib/economy/resolve-household-id.ts`, the economy shell/sub-nav, and the economy skeletons all carry over. **Reuse them.** See [`components/economy/AGENTS.md`](../../components/economy/AGENTS.md).
- ✅ **Category picker exists** from Phase 1: `listEconomyCategories` + `flattenCategories`. Rules and per-row recategorization both target a `categoryId` from this tree.
- ✅ **Account picker exists** from Phase 1: `listEconomyAccounts`. One import targets exactly one account.
- ✅ **CSV parser decided: PapaParse.** `package.json` has no CSV dependency yet — add `papaparse` (+ `@types/papaparse`). It's browser-first (parses `File`/`Blob` directly, handles BOM, `;`/`,` delimiter auto-detection, quoted newlines, optional web workers), which is exactly what client-side parsing needs. Add a `docs/tech-choices.md` entry per project convention. See open-Q #1 for why `csv-parser` (Node-stream-only) was rejected.

## How endpoints scope to a household (verified)

- **Preview** (`POST /v1/economy/import/preview`): `householdId` + `accountId` are in the **body** (`PreviewImportRequest`).
- **Commit** (`POST /v1/economy/import/commit`): `householdId` + `accountId` + `previewFingerprint` are in the **body** (`CommitImportRequest`).
- **List rules** (`GET /v1/economy/categorization-rules`): `householdId` is a **query param**.
- **Create rule** (`POST .../categorization-rules`): `householdId` is in the **body** (`CategorizationRuleRequest`).
- **Update rule** (`PUT .../categorization-rules/{ruleId}`): `ruleId` is a **path param**; `householdId` is in the **body**.
- **Delete rule** (`DELETE .../categorization-rules/{ruleId}`): `ruleId` is a **path param**; `householdId` is a **query param**.
- **Set enabled** (`PATCH .../categorization-rules/{ruleId}/enabled`): `ruleId` is a **path param**; body is `SetCategorizationRuleEnabledRequest { householdId, enabled }`.
- → The FE always sources `householdId` from `useHousehold()`. All Phase 4 screens live under `/h/[slug]/economy/...`. Server prefetch resolves it via `resolveHouseholdId(slug)`. ⚠️ Note the path param is `ruleId`, **not** `categorizationRuleId` (which is the response field) — don't conflate them.

---

## Open questions — resolve before / during build

1. ✅ **CSV parser = PapaParse.** The browser turns an uploaded `File` into `NormalizedImportRowRequest[]`. Decided: add `papaparse` (+ `@types/papaparse`) and a `docs/tech-choices.md` entry. PapaParse is browser-first (parses `File`/`Blob` directly, BOM strip, `,`/`;` delimiter auto-detection, quoted/embedded-newline handling, ~11M weekly downloads) — the right fit for real SE bank exports. **`csv-parser` was considered and rejected:** it's a Node _streaming_ parser (`engines: node >=10`, no `browser` build, model is `fs.createReadStream(...).pipe(csv())`) — no `fs`/Node stream exists in the browser, so it would need stream polyfills + a `File`→stream adapter and still lack the browser niceties. Either way, isolate PapaParse behind **one** module (`lib/economy/csv-parse.ts`) so the wizard stays parser-agnostic and the seam is unit-testable.
2. ✅ **Field mapping is client-side; the backend takes already-normalized rows.** `NormalizedImportRowRequest` fields: `rowNumber`, `occurredOn` (ISO date | null), `amount` (scalar | null), `currency` (`SEK`), `counterparty`, `reference`, `balanceAfter` (MoneyRequest | null), `rawDescription`, `categoryId` (null at preview). The wizard's "mapping" step maps the user's CSV header columns onto these fields. `rowNumber` is the 1-based source row; `currency` is stamped `"SEK"`; `categoryId` is left `null` for preview (rules auto-apply server-side).
3. ✅ **Preview returns per-row state; the client never computes duplicates or categories.** `PreviewImportResponse { householdId, accountId, previewFingerprint, rows: ImportRowResponse[] }`. Each `ImportRowResponse` carries `duplicateState` (`None | Exact | Possible`), `suggestedCategoryId`, `selectedCategoryId` (the rules-applied category), `rowFingerprint`, `suggestedSubscriptionMatches[]`, and `errors[]`. The duplicate chip is `None → "ny"`, `Exact|Possible → "dup"`. ⚠️ Verify against real data whether `Possible` warrants distinct copy (e.g. "möjlig dubblett") vs folding into `dup`; the type allows three states but the source plan only names two chips.
4. ✅ **`previewFingerprint` is the double-commit / re-import guard.** Commit echoes the `previewFingerprint` from the preview it was derived from (`CommitImportRequest.previewFingerprint`). Re-running preview on the same file surfaces `duplicateState` per row; committing the same batch twice is prevented backend-side via the fingerprint. **Do not** mint or mutate the fingerprint client-side — pass through exactly what preview returned. There is **no** "list imports" / import-history endpoint — import is a stateless preview→commit, not a saved session (mirrors Phase 3's "no occurrence history").
5. ✅ **Commit returns rule suggestions for the "Spara som regel?" step.** `CommitImportResponse { importedCount, duplicateCount, transactions: TransactionResponse[], suggestedRules: ImportRuleSuggestionResponse[] }`. Each `ImportRuleSuggestionResponse { pattern, match, targetCategoryId }` is a ready-to-create rule (same shape as `CategorizationRuleRequest` minus `householdId`). Offer them as one-click "create rule" after commit, routed through `createEconomyCategorizationRule`. ⚠️ Verify whether the backend already de-dupes suggestions against existing rules; if not, filter client-side against `listEconomyCategorizationRules` so you don't suggest a rule that already exists.
6. ✅ **Rules are household-wide; the 100-cap is on _enabled_ rules and is client-derived.** `ListCategorizationRulesResponse { rules: CategorizationRuleResponse[] }` — there is **no** server-provided `enabledCount` or `cap` field. Compute `rules.filter(r => r.enabled).length` for the "X / 100 enabled" badge, and disable create / enable-toggle at the cap. The backend stays authoritative (422 when exceeded → ProblemDetails). ⚠️ 100 is from the source plan; treat it as a UI constant (`RULE_ENABLED_CAP`) and verify the backend's exact bound — a mismatch should fail toward the backend's 422, not a stale client number.
7. ✅ **Match kind is `Contains | Regex`; Contains is the default, Regex is "Avancerat".** `CategorizationRuleRequest { householdId, match, pattern, targetCategoryId }`. Default the form to `Contains`; gate `Regex` behind an "Avancerat" toggle. Regex compile/timeout failures come back as `422` validation errors and map through `api/problems.ts` to the `pattern` field — **no** client-side regex evaluation or timeout logic (don't run user regex in the browser).
8. ✅ **Field-length limits are NOT in the generated Zod — they're client-side helpers.** `zNormalizedImportRowRequest` types `description` / `counterparty` / `reference` / `rawDescription` as bare nullable strings. The source-plan limits (description ≤ 500, counterparty ≤ 200, reference ≤ 200, rawDescription ≤ 1000) must live in a shared validator (`lib/economy/import-field-limits.ts`) and surface as row-level errors **before** preview/commit. The backend remains authoritative and returns 422 keyed per field.
9. ✅ **Max 1000 rows, one account per import — client-enforced, backend-authoritative.** `PreviewImportRequest` has a single `accountId` (one account per import by construction). The 1000-row cap is **not** in zod (`rows: z.array(...)` is unbounded) — enforce it client-side at upload/parse time with a clear message, and let the backend 422 be the backstop. `log()`/surface any client-side truncation; never silently drop rows past 1000.
10. ✅ **Subscription-match suggestions on rows belong to Phase 5, not here.** `ImportRowResponse.suggestedSubscriptionMatches` is populated, but linking subscriptions is Phase 5 (observe/link UI). For Phase 4, you **may** show a subtle "matchar prenumeration" hint per row, but **do not** build link/unlink affordances — defer to Phase 5. Don't block the import on it.

---

## Global rules (from the source plan — apply throughout)

- **SEK-only.** No currency picker. Row `currency` is stamped `"SEK"`; amounts display via `<Money>` / `formatMoney`. Rule patterns and category targets carry no currency.
- **No money math in the browser.** The browser parses CSV text into rows but never sums, converts, or recomputes amounts. Duplicate detection, category application, and import totals are all backend-computed (preview/commit responses). Render `MoneyResponse` via `<Money>`; coerce `number | string` counts with `Number()` for display only.
- **Membership-gated, not permission-string-gated.** Both `owner` and `member` import transactions and manage rules. No `<Can>` / `HOUSEHOLD_PERMISSION.*` gates — being inside the household shell is the gate.
- **Forms:** TanStack Forms + generated Zod (`zCategorizationRuleRequest`, `zSetCategorizationRuleEnabledRequest`, `zPreviewImportRequest`, `zCommitImportRequest`, `zNormalizedImportRowRequest`) + the ProblemDetails mapper (`api/problems.ts`). No per-form error handling. Row-level field-length checks (open-Q #8) run before the generated-Zod parse.
- **Reads:** server prefetch + React Query hydration for first paint (`listEconomyCategorizationRules` for the rules manager) per ADR 0009; `client: serverClient` in the server component. The import wizard has **nothing to prefetch as a read** (preview is a mutation) beyond accounts + categories for the pickers.
- **URL state:** `nuqs` for the wizard **step** and selected **accountId** (acceptance: "wizard step/account state survives navigation"), and for any rules-list filter. Note: the Phase 1 setup wizard uses local `useState` for its step — the **import wizard must not**, because navigation-survival is an explicit acceptance criterion. ⚠️ The parsed-CSV rows and the preview response are **too large for the URL** — keep those in React Query / component state; only the step + accountId (+ maybe a fingerprint) live in the URL.
- **Copy:** English i18n (`messages/en`, wired through `messages/en/index.ts`) as in Phase 0–3. The source plan's Swedish strings ("Spara som regel?", "Avancerat", "ny"/"dup", "Bekräfta") are illustrative — render via i18n keys with English values unless product asks for a Swedish locale.
- **Mobile-first.** The preview table is the one genuinely table-shaped surface (many columns); make it a horizontally-scrollable table on desktop and a stacked per-row card on phone. The rules manager is phone-first cards. No `useIsMobile`.

---

## Routing & shell

Import and rules are two new economy sub-sections. The wizard is multi-step (URL-driven); the rules manager is a single page reachable both from the sub-nav and from the post-commit "save as rule" step:

```
app/(app)/app/h/[slug]/economy/
├── import/
│   └── page.tsx        — CSV import wizard (steps via ?step=, account via ?accountId=)
└── rules/
    └── page.tsx        — categorization rules manager (list + create/edit/enable/delete)
```

- Add **Import** and **Rules** entries to the economy sub-nav in `components/economy/economy-shell.tsx` (`tabs` array) + `economy.shell.nav.import` / `economy.shell.nav.rules` i18n keys and `metadata.app.economy.import` / `rules` titles.
- New components in `components/economy/` (mirror existing economy conventions). Update `components/economy/AGENTS.md` with the Phase 4 contract points once stable.
- The wizard is **one route with internal steps** (not a route per step) — `?step=` selects the panel, `?accountId=` carries the target account. Steps that can't be resumed from URL alone (e.g. "preview" needs the parsed rows + fingerprint in memory) must guard: if the in-memory state is missing, bounce the user back to the upload step rather than rendering a broken panel.

---

## Workstreams (suggested order)

### WS0 — Cross-cutting import/rule utilities (build first)

- Add `papaparse` + `@types/papaparse` (+ `docs/tech-choices.md` entry), then `lib/economy/csv-parse.ts` — wraps PapaParse behind `parseCsv(file) → Promise<{ headers: string[]; rows: string[][] }>` (BOM strip, `,`/`;` delimiter auto-detect, quoting). Keep the PapaParse types at this seam so callers stay parser-agnostic; unit-test the wrapper's normalization (the parse engine itself is PapaParse's responsibility).
- `lib/economy/import-field-limits.ts` — `IMPORT_FIELD_LIMITS` (`description: 500`, `counterparty: 200`, `reference: 200`, `rawDescription: 1000`) + `IMPORT_MAX_ROWS = 1000` + `validateImportRow(row)` → field errors (open-Q #8, #9). Tests.
- `lib/economy/import-mapping.ts` — the field-mapping model: the set of mappable target fields, `applyMapping(headers, rows, mapping) → NormalizedImportRowRequest[]` (stamps `currency: "SEK"`, `rowNumber`, leaves `categoryId: null`). Pure, tested.
- `lib/economy/categorization-rule.ts` — `RULE_MATCH` (`Contains` / `Regex`) constant (mirror the `TRANSFER_MODE` / `RECURRING_BILL_TYPE` pattern), `RULE_ENABLED_CAP = 100`, `enabledRuleCount(rules)`, `isAtRuleCap(rules)`. `IMPORT_DUPLICATE_STATE` constant + `duplicateChip(state)` → `"new" | "dup"`. Tests.
- `lib/economy/import-step.ts` (or a `nuqs` parser in the existing pattern) — the `?step=` enum parser (`upload | map | preview | done`) and its server-safe constant counterpart, following the client-only-nuqs split documented in `components/economy/AGENTS.md` #9/#14.
- Add an import-preview-row skeleton + a rules-row skeleton to `components/economy/economy-skeletons.tsx`.

### WS1 — Rules manager (`rules/page.tsx`)

- List via `listEconomyCategorizationRulesOptions({ query: { householdId } })`; server-prefetch for first paint.
- Each rule row: **match kind** badge (Contains / Regex), **pattern**, **target category** name (join `listEconomyCategories` + `flattenCategories`), **enabled** switch (`setEconomyCategorizationRuleEnabled`), **edit** (opens the create/edit form), **delete** (`deleteEconomyCategorizationRule`, with confirm).
- **Enabled-count badge** "X / 100 enabled" (open-Q #6). When at cap, disable "New rule" and any enable-toggle that would turn one **on**, with a friendly cap message. Toggling one **off** stays allowed.
- Create/edit form: TanStack form → `createEconomyCategorizationRuleMutation` / `updateEconomyCategorizationRuleMutation`, validated with `zCategorizationRuleRequest`. Fields: `match` (default `Contains`; `Regex` behind an "Avancerat" toggle), `pattern`, `targetCategoryId` (flattened categories). Regex errors map to the `pattern` field via the ProblemDetails mapper (open-Q #7).
- On every mutation success: invalidate `listEconomyCategorizationRulesQueryKey`. Mobile-first cards.

### WS2 — Import wizard shell + step 1 (upload + account)

- `import/page.tsx`: server component prefetches `listEconomyAccounts` + `listEconomyCategories` (for the mapping/recategorization pickers), hydrates a client `ImportWizard`.
- `ImportWizard` owns `?step=` + `?accountId=` (`nuqs`) and the in-memory parsed rows + preview response (React Query / state, **not** URL — open-Q on URL size).
- **Step 1 — Upload:** file input (accept `.csv,text/csv`), account picker (`listEconomyAccounts`). Parse on selection via `csv-parse`; enforce `IMPORT_MAX_ROWS` (open-Q #9). Show parse errors (encoding, no rows, too many rows). One account per import.

### WS3 — Import wizard step 2 (field mapping)

- **Step 2 — Map:** show the parsed headers and let the user map each CSV column → a `NormalizedImportRowRequest` field (`occurredOn`, `amount`, `description`, `counterparty`, `reference`, `balanceAfter`, `rawDescription`). Persist the mapping in component state; offer a sensible auto-guess by header name.
- Run `validateImportRow` (field-length limits) across the mapped rows; block advancing while any row has a length violation, surfacing the first offending field per row.
- "Continue" calls `previewEconomyImportMutation({ body: { householdId, accountId, rows } })` and advances to step 3 on success. Map any 422 (e.g. unparseable date, bad amount) through the ProblemDetails handler.

### WS4 — Import wizard step 3 (preview) + commit

- **Step 3 — Preview:** render `previewResponse.rows` (an `ImportRowResponse[]`). Per row: date, amount (`<Money>`), description/counterparty, **duplicate chip** (`duplicateChip(state)` → "ny"/"dup"; open-Q #3), **auto-applied category** (`selectedCategoryId`, fallback `suggestedCategoryId`) with **inline recategorization** (a category select that edits the row's chosen `categoryId`), and **row-level validation errors** (`row.errors[]`). Optionally a subtle "matches subscription" hint (open-Q #10, display-only).
- Row selection: let the user exclude rows (default-exclude `Exact` duplicates is a reasonable UX default — verify with product). The committed `rows` are the accepted rows mapped back to `NormalizedImportRowRequest` (carry each row's chosen `categoryId`).
- **Commit:** `commitEconomyImportMutation({ body: { householdId, accountId, previewFingerprint, rows } })` — pass through the **exact** `previewFingerprint` from the preview (open-Q #4). On success: invalidate `listEconomyTransactionsQueryKey`, `getEconomyAccountBalancesQueryKey`, and every budget-summary period for the household (predicate match — same pattern as `transfer-form.tsx` / `recurring-bills-page.tsx`, since a commit books real transactions). Advance to step 4.

### WS5 — Import wizard step 4 ("Spara som regel?" suggestions)

- **Step 4 — Done:** show `importedCount` / `duplicateCount` (coerce with `Number()`), and the `suggestedRules` (open-Q #5). Each suggestion renders its pattern + match kind + target-category name with a one-click "create rule" → `createEconomyCategorizationRuleMutation`, respecting the enabled cap (WS1). Filter out suggestions that already exist as rules. Provide a clear "import another" reset (clears in-memory rows, returns to step 1) and a link to the transactions list.
- On creating a rule from a suggestion: invalidate `listEconomyCategorizationRulesQueryKey`.

### WS6 — Verification

- `pnpm typecheck` + `pnpm lint` (0 errors) · `pnpm test --run` (csv-parse, field-limits, mapping, rule-cap, duplicate-chip helpers) · `pnpm build` (new routes; **watch the nuqs client/server boundary** for the `?step=`/`?accountId=` parsers — keep server prefetch on the constant-only module, per AGENTS.md #9/#14). `pnpm build` needs `SESSION_SECRET` (`.env.example`).
- Manual: re-importing the same file shows duplicates and the second commit is prevented; a `Contains "ICA"` rule applies Mat in preview; the rule cap is visible and enforced; wizard step + account survive a refresh/navigation; SEK fixed everywhere; owner **and** member can both import and manage rules.
- `react-doctor` — no score regression. `permission-review` only if a `<Can>`/permission guard is added (import + rules are membership-gated, so likely N/A). The preview table is the one place to watch `no-array-index-as-key` — key rows by `rowFingerprint`, not array index.

---

## Acceptance criteria (from the source plan)

- ✅ Re-import shows duplicates and prevents double-commit (`duplicateState` + `previewFingerprint`).
- ✅ Contains "ICA" applies Mat in preview (rules auto-apply server-side → `selectedCategoryId`).
- ✅ Rule cap is visible and enforced in the UI (client-derived enabled count; backend 422 backstop).
- ✅ Wizard step/account state survives navigation (`?step=` + `?accountId=` via `nuqs`).
- ✅ SEK-only; field-length limits validated client-side; one account / ≤1000 rows per import.
- ✅ Owner and member can both import and manage rules (membership-gated).

---

## Contract appendix — Phase 4 request/response shapes (from generated client)

| Operation                                     | Key fields                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `previewEconomyImport` (POST)                 | body `PreviewImportRequest { householdId, accountId, rows: NormalizedImportRowRequest[] }` → `PreviewImportResponse { householdId, accountId, previewFingerprint, rows: ImportRowResponse[] }`                                                                |
| `commitEconomyImport` (POST)                  | body `CommitImportRequest { householdId, accountId, previewFingerprint, rows: NormalizedImportRowRequest[] }` → `CommitImportResponse { importedCount, duplicateCount, transactions: TransactionResponse[], suggestedRules: ImportRuleSuggestionResponse[] }` |
| `listEconomyCategorizationRules` (GET)        | query `householdId` → `ListCategorizationRulesResponse { rules: CategorizationRuleResponse[] }`                                                                                                                                                               |
| `createEconomyCategorizationRule` (POST)      | body `CategorizationRuleRequest { householdId, match, pattern, targetCategoryId }` → `201 CategorizationRuleResponse`                                                                                                                                         |
| `updateEconomyCategorizationRule` (PUT)       | path `ruleId`; body `CategorizationRuleRequest` → `200 CategorizationRuleResponse`                                                                                                                                                                            |
| `deleteEconomyCategorizationRule` (DELETE)    | path `ruleId`; query `householdId` → `204`                                                                                                                                                                                                                    |
| `setEconomyCategorizationRuleEnabled` (PATCH) | path `ruleId`; body `SetCategorizationRuleEnabledRequest { householdId, enabled }` → `200 CategorizationRuleResponse`                                                                                                                                         |

**Enums:** `CategorizationRuleMatch = 'Contains' \| 'Regex'` · `ImportDuplicateState = 'None' \| 'Exact' \| 'Possible'` · `Currency = 'SEK'`.

**Key request/response shapes:**

- `NormalizedImportRowRequest { rowNumber, occurredOn: null|string, amount: null|number|string, currency: 'SEK', counterparty: null|string, reference: null|string, balanceAfter: null|MoneyRequest, rawDescription: null|string, categoryId: null|string }`
- `ImportRowResponse { rowNumber, occurredOn, amount: null|MoneyResponse, currency, counterparty, reference, balanceAfter, rawDescription, suggestedCategoryId, selectedCategoryId, duplicateState, rowFingerprint, suggestedSubscriptionMatches: SubscriptionMatchSuggestionResponse[], errors: ImportRowValidationErrorResponse[] }`
- `ImportRowValidationErrorResponse { field, message }`
- `ImportRuleSuggestionResponse { pattern, match: CategorizationRuleMatch, targetCategoryId }`
- `CategorizationRuleResponse { categorizationRuleId, householdId, match, pattern, targetCategoryId, enabled }`

> Money: row `amount` is a raw scalar with a sibling `currency` (always `"SEK"`) — **not** a `MoneyRequest` object — while `balanceAfter` IS a `MoneyRequest`/`MoneyResponse`; submit/display accordingly. Counts (`importedCount`, `duplicateCount`) and any paging numbers are `number | string` — coerce with `Number()`, never compute. Dates (`occurredOn`) are ISO `YYYY-MM-DD`. **Import is JSON** (browser parses the CSV; no upload endpoint), the `previewFingerprint` threads preview→commit as the double-commit guard, and there is **no** import-history / list-imports endpoint and **no** server-provided rule-enabled count — derive both client-side.
