# Household + Economy — FRONTEND Implementation Plan

> **Repo:** frontend (Next.js / TypeScript). **Audience:** frontend implementation agent.
> **Counterpart:** backend owns the API. Do not read backend code. Your contract is the generated OpenAPI client plus this plan. If endpoint shape is unclear, the generated OpenAPI client is source of truth.

---

## 0. Context

### Stack

- Next.js 16 App Router + React 19 + TypeScript.
- BFF pattern: all backend calls go through `/api/proxy`.
- Never call backend directly from the browser.
- Never expose tokens client-side.
- URL state via `nuqs` for filters, selected months, pagination, wizard step where appropriate.
- Charts via Recharts.
- Types come from regenerated OpenAPI client. Do not hand-roll DTOs.

### Global Economy Rules

- Economy is a shared household workspace: both `owner` and `member` can use normal Economy actions.
- Economy v1 is **SEK-only**.
- Money DTOs still use `{ amount, currency }`, but forms must submit `currency: "SEK"` automatically.
- Do not render a currency picker.
- Do not do money math in the browser. Display backend values only.
- Route scope is `/h/[slug]/...`.
- Swedish user-facing copy; English code identifiers.

### Backend Behavior To Respect

1. A subscription never posts money. Subscription UI is observe/manage/link only.
2. Transfers have explicit `mode`: neutral vs savings. Savings transfer carries optional category, default Sparande.
3. Estimated recurring bills appear as pending confirmations.
4. Analytics are display-only and may show sparse early data.
5. Receipt upload is backend-mediated multipart attach, not reserve/direct upload.
6. GDPR export is self-scoped. A user exports only their own Economy personal data.
7. Field encryption is required before production but is not currently active. Do not overclaim privacy.

### Do Not Build Yet

- No receipt reservation/direct-to-blob upload flow.
- No multi-currency UI.
- No household-wide GDPR export UI.
- No claim that operators/raw DB access cannot see financial notes/names yet.
- No full recurring-bill occurrence history UI unless a future endpoint appears.
- No owner-only gating for normal Economy mutations.

---

## Phase 0 — Households Rename

**Goal:** reflect Organizations → Households across routing, hooks, and RBAC.

### Tasks

- Route `/o/[slug]` → `/h/[slug]`; add redirects if needed.
- Rename org hooks/components to household naming.
- RBAC reflects `owner | member`.
- Remove old admin/viewer household-role UI.
- Regenerate API client.

### Acceptance

- All routes resolve under `/h/[slug]`.
- Members can access shared Economy workspace actions.
- No dead `/o/` links.

---

## Phase 1 — Economy Core UI

**Goal:** first-run setup, accounts, categories, budget editor.

### Setup Wizard

- Fixed currency: SEK.
- Do not offer other currency choices.
- Cycle start day picker constrained to 1–28.
- Confirm seeded categories: Mat, Boende, Transport, Sparande, etc.
- Calls settings endpoints from generated client.

### Accounts

- Create/list accounts.
- Account types: `Spending | Savings`.
- Opening balance submits `{ amount, currency: "SEK" }`.
- Do not show currency selector.

### Categories

- Render category tree.
- Support budgetable and non-budgetable categories.
- Prevent third-level categories in UI.
- Non-budgetable categories should show a “tracked / no budget” affordance.

### Budget Editor

- Show budgetable categories as editable lines.
- Show non-budgetable categories as tracked/read-only/no-budget.
- “Kopiera från föregående period” button.
- Empty prior period shows empty editable budget, not an error.

### Acceptance

- Third category level is disabled and backend rejection handled gracefully.
- SEK is fixed in all money entry.
- Owner and member can use Economy setup/budget screens if authorized by household membership.

---

## Phase 2 — Transactions · Receipts · Transfers

**Goal:** daily driver, mobile-first.

### Transaction Form

- Amount, category, note, optional payer.
- Currency fixed to SEK.
- Save without receipt is allowed.
- Members and owners can record transactions.

### Receipt Upload

Backend supports one-step multipart attach:

- `POST /v1/economy/transactions/{transactionId}/receipt`
- Multipart fields:
  - `householdId`
  - `file`

Frontend behavior:

- Accept PDF, PNG, JPEG.
- Validate size before submit: max 10 MB.
- Show friendly validation errors for unsupported/oversized/empty files.
- Show upload progress if possible through BFF/proxy, but do not invent direct upload.
- After success, show receipt indicator.

### Transaction List

- Filters in URL via `nuqs`:
  - category
  - date range
  - payer
  - has receipt
  - amount range
  - page/pageSize
- Free-text note search.
- Receipt indicator column.
- Mobile-friendly list first, desktop table optional.

### Transfers

- From/to account pickers.
- Amount fixed to SEK.
- “Bokför som Sparande” toggle.
- Default toggle on when destination account type is `Savings`; user can override.
- Submit explicit `mode` and optional `categoryId`.
- Neutral transfer should read as movement, not spending.

### Budget Overview

- Planned vs actual per category.
- Pace indicator copy, e.g. “60% genom perioden, 80% spenderat”.
- Over-pace visually flagged.

### Acceptance

- Expense with receipt uploads via multipart attach and then shows receipt indicator.
- Neutral transfer does not appear as spending.
- Savings transfer appears under Sparande allocation.
- Filters survive refresh/share.

---

## Phase 3 — Recurring Bills UI

**Goal:** manage fixed/estimated recurring bills and confirmations.

### Bills List

- Show fixed vs estimated.
- Show next due date, direction, amount, account/category.
- `ListRecurringBills` returns pending occurrences only, not full historical occurrence lists.
- Do not build historical occurrence timeline unless a new endpoint appears.

### Create Bill

- Amount fixed to SEK.
- Cadence: monthly frequency/interval/day.
- Direction: expense/income.
- Type: fixed/estimated.
- Account and optional category.

### Pending Confirmation Inbox

- Estimated bills pending confirmation.
- Inline “Bekräfta” with real amount.
- Confirm removes from pending.

### Per-Occurrence Actions

- Skip, pause, resume a single current occurrence.
- UI should not allow arbitrary future-date drift.

### Acceptance

- Estimated bills clearly distinct from fixed.
- Confirming pending bill removes it from inbox.
- Skipping one occurrence does not visually alter later recurring setup.

---

## Phase 4 — CSV Import Wizard + Rules Manager

**Goal:** multi-step import flow and categorization rules.

### Import Wizard

Steps:

1. Upload CSV and select target account.
2. Field mapping.
3. Preview normalized rows.
4. Commit accepted rows.
5. Offer “Spara som regel?” suggestions after hand-categorization.

Backend constraints:

- One account per import.
- Max 1000 rows.
- Currency fixed to SEK.
- Field length client validation:
  - description max 500
  - counterparty max 200
  - reference max 200
  - raw description max 1000
  - currency fixed `SEK`

Preview UI:

- Duplicate chip: “ny” / “dup”.
- Auto-applied category.
- Inline recategorization.
- Row-level validation errors.

### Rules Manager

- Rules are household-wide.
- Max 100 enabled categorization rules per household.
- Show enabled count.
- Disable create/enable when at cap.
- Friendly cap message.
- Contains rules are default.
- Regex behind “Avancerat” toggle.
- Regex validation/timeout errors shown as validation errors.

### Acceptance

- Re-import shows duplicates and prevents double-commit.
- Contains “ICA” applies Mat in preview.
- Rule cap is visible and enforced in UI.
- Wizard step/account state survives navigation.

---

## Phase 5 — Subscriptions

**Goal:** subscription management, calendars, linking. Observe-only.

### Subscription Board

- List lifecycle state: Trial, Active, Paused, Cancelled.
- Create subscription.
- Change lifecycle state.
- Do not imply subscription creation moves money.

### Year Payment Calendar

- Show charge months per subscription.
- Monthly fills all months; every-6-month cadence marks two.

### Month Charge Calendar

- Month selector in URL via `nuqs`.
- Day-grid with charges.
- Monthly total from backend.
- Distinguish actual vs predicted using generated client fields.

### Charge History + Linking

`GetChargeHistory` is paginated.

UI requirements:

- URL state:
  - `chargePage`
  - `chargePageSize`
- Consume response metadata:
  - `page`
  - `pageSize`
  - `total`
- Render previous/next or compact pagination.
- Show linked transactions and derived price changes from backend response.
- Manual link/unlink works.
- Suggested matches rendered distinctly from confirmed actual links.

### Match State

Verify exact generated-client enum/string values before coding conditionals. Expected concepts:

- actual
- predicted
- suggested

### Acceptance

- No UI path implies subscription charges an account.
- Month changes update URL.
- Price change such as 99 → 119 is visible.
- Charge history pagination works and survives refresh.

---

## Phase 6 — Analytics

**Goal:** six display-only chart surfaces using Recharts.

### Surfaces

- Category trend: multi-line.
- Spend breakdown: donut/pie.
- Period comparison: grouped bar.
- Income vs expense: bar/area.
- Variance history: line.
- Top transactions: ranked list/bar.

### Requirements

- Use backend series shapes directly.
- Do not recompute aggregates.
- URL state for period/category selectors.
- Honest sparse-data state: “Inte tillräckligt med data än”.

### Acceptance

- Charts render on rich data.
- Empty/low-data states look intentional.
- Savings allocation appears where backend includes it, not recomputed in browser.

---

## Phase 7 — Privacy Page

**Goal:** accurate privacy posture, no overclaiming.

### Copy Must Say

- GDPR export is self-scoped: users export their own Economy personal data.
- Receipt blobs linked to user-attributed erased transactions are deleted during erasure.
- Sensitive Economy field encryption is a pre-production backend requirement.
- Until field encryption ships, operators/raw DB access may still expose plaintext Economy names/notes.

### Copy Must Not Say

- “We cannot see your financial data.”
- “All sensitive fields are encrypted.”
- “Household owners can export all members’ Economy data.”

### Acceptance

- Copy matches backend behavior.
- No privacy overclaiming.

---

## Cross-Cutting Utilities

Build early:

- SEK currency formatter for structured money DTOs.
- Cycle/period display helper, labels only.
- `nuqs` parsers for filters, selected month, page/pageSize.
- Shared loading, empty, error states.
- Shared validation helpers for import field length and receipt file size/type.

---

## Open Items To Verify From Generated Client

| Item                                                       | Status                                         |
| ---------------------------------------------------------- | ---------------------------------------------- |
| Exact receipt endpoint operation name                      | Verify in generated client                     |
| Exact `matchState` generated values                        | Verify before conditional rendering            |
| Exact import duplicate field name                          | Verify generated preview row type              |
| Exact pagination shape for charge history                  | Verify generated response                      |
| Whether OpenAPI exposes all validation errors consistently | Verify through generated client/error handling |
