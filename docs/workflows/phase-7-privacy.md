# Phase 7 — Privacy Page · Execution Plan

> Execution detail for **Phase 7** of [`economy-household-frontend-plan.md`](../../economy-household-frontend-plan.md).
> Source-plan goal: _"accurate privacy posture, no overclaiming."_
> Builds on the completed Phase 6 (analytics). Prereq: be on a branch off the merged Phase 6.
>
> **Nature of this phase:** unlike Phases 1–6 this is **accuracy-first, not feature-first**.
> The deliverable is a small surface whose value is that every sentence is _true against the
> backend as shipped_. The one functional addition — a self-scoped economy GDPR export — rides
> on an endpoint that already exists in the snapshot. There is **no API sync expected**; WS0
> instead **confirms three backend-behavior claims with the backend team**, because the FE cannot
> verify them from the client and the copy is wrong if any of them is stale.
>
> **Backend behaviors confirmed 2026-06-11.** The _codebase_ facts below (endpoints, routes,
> i18n, download pattern, existing surfaces) were verified by reading the repo; the _backend
> privacy behaviors_ (field-encryption status, erasure blob deletion, export self-scoping +
> payload) were confirmed with the backend team on 2026-06-11 and are recorded in
> "Resolved contract answers" below. **Net: the self-scoped export button ships; encryption is
> NOT live, so the "not encrypted yet" copy variant is the true one.** The encryption line has no
> runtime flag — it's a manual release-time copy switch until field encryption lands.

## Status of prerequisites

- ✅ **The economy GDPR export endpoint is already generated.** `GET /v1/economy/gdpr/export?householdId=` → `ExportEconomyGdprResponse { householdId, exportedAt, data: {…} }`; generated as `exportEconomyGdpr` / `exportEconomyGdprOptions` in `api/generated/`. **Unwired today** — no UI calls it. WS0 only verifies it's present; do **not** `pnpm api:sync` unless it's missing.
- ✅ **The personal-data export + erasure surface already exists** at `/app/me/settings/data` (`components/settings/data-settings.tsx`): downloads `GET /v1/users/me/personal-data` as JSON (Blob + anchor, `"hemma-personal-data.json"`), deletes the account (`DELETE /v1/users/me`, with the sole-owner `UserErasureBlocked` remediation), and manages legal-document acceptances. The economy privacy page **links to it** for the account-level export + erasure; it does **not** duplicate erasure.
- ✅ **Legal documents are backend-driven markdown** (`getLegalDocument`, `components/legal/legal-markdown.tsx`), viewed in settings sheets. The privacy page is **product copy about economy data handling**, not a legal-document viewer — keep the two distinct (a legal Privacy Policy is a separate, versioned, accepted artifact).
- ✅ **Phase 1–6 utilities carry over.** `resolveHouseholdId`, the economy shell + sub-nav (`ECONOMY_NAV_ITEMS` in `components/app-shell/household-nav.tsx`), `useHousehold()`, the skeletons, and the on-click JSON-download pattern from `data-settings.tsx`. **Reuse them.** See [`components/economy/AGENTS.md`](../../components/economy/AGENTS.md).
- ✅ **The three copy-gating claims are confirmed (2026-06-11; see "Resolved contract answers").** Encryption: **not live** for Economy. Erasure: receipt blobs **are** deleted (two triggers). Export: **self-scoped** to the caller. Shipping stale copy is still the one failure mode this phase exists to prevent — the encryption line stays a release-time check (no runtime flag exists).

## How the export scopes to a household (verified from the client)

- `GET /v1/economy/gdpr/export` takes `householdId` as a **query param** → `200 ExportEconomyGdprResponse`. ✅ Confirmed self-scoped: the caller must be authorized to read the household, but the payload is filtered to transactions where **`payerId == currentUserId`** within that household — the caller's own economy data, **not** every member's. Ship a clearly-labelled "Export my economy data" button; **never** label it a household export.
- → `householdId` from `useHousehold()`; the page lives under `/h/[slug]/economy/privacy`; the export is fetched **on demand** (button click), never prefetched or cached (it's sensitive personal data — see Global rules).

---

## Resolved contract answers (confirmed with backend 2026-06-11 — build against these)

Each maps directly to a sentence the page does or does not say.

1. ✅ **Sensitive-field encryption is NOT shipped for Economy.** Persistence is still plaintext for transaction notes, account/category names, **and amounts**. There is **no runtime flag/endpoint** the FE can read → treat the encryption line as a **manual release-time copy switch** (one i18n key; on the release checklist). Use the backend's confirmed wording: _"Sensitive economy fields aren't encrypted at rest yet. Operators or anyone with raw database access may still see plaintext names, notes, and amounts. Encryption is a pre-production requirement."_
2. ✅ **Erasure deletes receipt blobs — two triggers, both anonymize-in-place.**
   - **Account erasure** (`DELETE /v1/users/me` → `UserErasureRequestedV1`): Economy anonymizes **all** transactions where the user is payer, deleting the linked receipt blobs.
   - **Household member removal** (`HouseholdMemberRemovedV1`): Economy anonymizes that member's transactions **only in that household**, deleting linked receipt blobs there.
   - In both, the **transaction row is retained** but `payerId`, `note`, import fingerprint, and receipt metadata are **cleared** (and the blob deleted). The page may state both triggers honestly; don't imply the row vanishes.
3. ✅ **`economy/gdpr/export` is self-scoped to the caller** — filtered to `payerId == currentUserId` within the household (caller must be authorized to read the household). Not household-wide, never exposes other members' data. → **Ship** the "Export my economy data" button; label it as _your own_ data, not a household export.
4. ✅ **Payload + UX confirmed.** `{ householdId, exportedAt, data }` where `data.transactions` is an array of the caller's own economy transactions in that household. Per-transaction fields: `transactionId, householdId, accountId, categoryId, amount, currency, occurredOn, note, kind, hasReceipt, subscriptionId, transferId, isTransferOutflow, isPending`. **No raw receipt files or blob keys** — `hasReceipt` is a boolean only. Download the JSON **verbatim**, do **not** render inline, and claim nothing beyond _"your economy transaction data for this household."_ A fresh household / no caller transactions → **`200` with `data.transactions: []`** (not 404, not `data: {}`).

> The gate is resolved: the export button ships and the "not encrypted yet" copy is the true variant. The standing risk is the encryption line going stale — re-confirm it at every release until field encryption lands (no flag to automate it).

---

## Global rules (from the source plan — apply throughout)

- **Accuracy over polish.** Every claim must be true against the backend as shipped. When in doubt, say less. The "Copy Must Not Say" list (below) is a hard constraint, not a guideline.
- **Read-only, on-demand, uncached.** No mutations on this surface. The export is a `GET` triggered by a button click and streamed straight to a file download — **never** prefetched (ADR 0009 is for first-paint reads; this is sensitive data the user explicitly asks for) and **never** left in the React Query cache. Mirror `data-settings.tsx`'s raw-`fetch`-then-Blob pattern, not a `useQuery`.
- **Self-scoped only.** The economy export is the **caller's own** data. No owner-exports-everyone UI; no household-wide export (Do-Not-Build). Label the button so a user can't mistake it for a household-wide dump.
- **Membership-gated, not permission-string-gated.** Owner and member both see the page and export their own data. No `<Can>` gates.
- **Disclosure, not legal contract.** This is honest product copy about how economy data is handled — distinct from the versioned, accepted **Privacy Policy** legal document (`getLegalDocument`). Link to the legal doc and to `/me/settings/data`; don't reimplement either.
- **Swedish user-facing copy; English code identifiers.** English catalog now (`messages/en`), same convention as Phases 1–6; the `sv` strings land with the future locale. ⚠️ Privacy copy translation is **semantic, not mechanical** — the Swedish wording must preserve the exact non-overclaiming meaning (flag for review with the eventual translator).

---

## Routing & shell

One new economy sub-nav entry (**Privacy**), one route — a disclosure page plus the self-scoped export action:

```
app/(app)/app/h/[slug]/economy/privacy/
└── page.tsx          — server component: resolveHouseholdId(slug), generateMetadata;
                        renders the (client) privacy disclosure + self-scoped export
```

- Add a **privacy** entry to `ECONOMY_NAV_ITEMS` in `components/app-shell/household-nav.tsx` (place it last, after `import` — it's an about/settings surface, not a daily driver) + `economy.shell.nav.privacy` i18n key + `metadata.app.economy.privacy` title.
- New component(s) in `components/economy/`: `privacy-page.tsx` (the disclosure sections + the export card). Keep the export action in its own small component or function so the no-prefetch/no-cache download path is greppable.
- **Placement rationale (resolved):** the economy sub-nav at `/h/[slug]/economy/privacy` — because the copy is economy-specific, the export endpoint is `householdId`-scoped, and the route-scope rule is `/h/[slug]/…`. This mirrors Phase 6's "one sub-nav entry, one route." Considered and rejected: folding into `/app/me/settings/data` (that surface is **user-global**, not household-economy-scoped, and can't carry a `householdId` export cleanly) — instead the two **cross-link**.

---

## Workstreams (suggested order)

### WS0 — Gate (✅ resolved 2026-06-11)

- **Verify** (don't sync): `exportEconomyGdpr` / `exportEconomyGdprOptions` + `ExportEconomyGdprResponse` exist in `api/generated/`. If missing, stop and `pnpm api:sync` as a separate commit (Phase 5/6 WS0 protocol). _(Confirmed present.)_
- The four contract questions are answered (see "Resolved contract answers"). **Decisions locked:** encryption copy = the "not encrypted yet" variant; the self-scoped export button **ships**. Carry these answers into `components/economy/AGENTS.md` (#43+) during WS4.
- Smoke-probe `GET /economy/gdpr/export?householdId=` against a seeded household and a fresh one to confirm the `data.transactions: []` empty case in practice (Phases 5–6 verification habit).

### WS1 — Route, shell tab, page scaffold

- Server component `privacy/page.tsx`: `resolveHouseholdId(slug)`, `generateMetadata` from `metadata.app.economy.privacy`. No prefetch (nothing to first-paint; the export is on-demand). Render `<PrivacyPage />` (client only where it needs the export click handler / `useHousehold`).
- Economy shell tab + `economy.shell.nav.privacy` + metadata key land here so the page is reachable for WS2+.

### WS2 — Disclosure copy (the heart — no backend dependency, can land first)

Sections, each a clear heading + body, written to the **exact** posture below. Encode as an `economy.privacy.*` i18n tree (one key per claim so the encryption line is independently flippable).

**Copy MUST say (confirmed wording):**

- **Encryption (its own i18n key — the release-time switch):** _"Sensitive economy fields aren't encrypted at rest yet. Operators or anyone with raw database access may still see plaintext names, notes, and amounts. Encryption is a pre-production requirement."_
- **Export is self-scoped:** you export **your own** economy transaction data for this household (transactions where you're the payer) — not other members'.
- **Erasure deletes receipts:** when your account is erased, or you're removed from this household, your economy transactions are anonymized — payer, note, and receipt metadata cleared and the **receipt files deleted** — while an anonymized row is retained. (Account erasure lives at `/me/settings/data`.)

**Copy MUST NOT say (hard constraints — add as review checklist + ideally a test):**

- ❌ "We cannot see your financial data."
- ❌ "All sensitive fields are encrypted."
- ❌ "Household owners can export all members' economy data."

- Link out to: the legal **Privacy Policy** (`getLegalDocument` / the legal sheet) and `/app/me/settings/data` (full personal-data export + account erasure). Do not duplicate erasure here.

### WS3 — Self-scoped economy GDPR export (✅ ships — self-scoping confirmed)

- An **Export my economy data** card: on click, `fetch('/api/proxy/v1/economy/gdpr/export?householdId=…')`, `Blob` → anchor download (`hemma-economy-data-{slug}.json`), `URL.revokeObjectURL`. Mirror `downloadPersonalData()` in `data-settings.tsx` (raw fetch, not `useQuery`; loading + disabled state; no cache).
- Label unambiguously **self-scoped** ("your own economy data in this household") so it can't read as a household-wide dump. The empty case (`data.transactions: []`) still downloads a valid file — fine; don't special-case it as an error.
- No invalidation, no toast-on-success beyond a quiet "downloaded" affordance; surface a generic error if the fetch fails (no ProblemDetails field-mapping — there's no form).

### WS4 — Wiring & docs

- Full `economy.privacy.*` i18n tree (section headings, the four claims as discrete keys, export-card labels, the encryption-status line as its own key) + `economy.shell.nav.privacy` + `metadata.app.economy.privacy`.
- Add Phase 7 contract points to `components/economy/AGENTS.md` (#43+): the confirmed encryption status (with a "verify at each release" flag), erasure blob-deletion behavior, export self-scoping + on-demand/uncached rule, and the "must-not-say" overclaim list as a maintenance guardrail.

### WS5 — Verification

- `pnpm typecheck` + `pnpm lint` (0 errors) · `pnpm test --run` · `pnpm build` (new route; `SESSION_SECRET` required).
- **Copy review against backend** (the real acceptance): walk every sentence against the WS0 answers; grep the catalog for the three forbidden claims; confirm the encryption line matches live status. Consider a unit test asserting the `economy.privacy.*` catalog contains none of the forbidden phrasings.
- Manual (seed via API as in Phases 5–6; admin `admin@example.test`, DB resets on restart): the page is reachable from the economy sub-nav; the export downloads a JSON file scoped to the caller; owner **and** member both see the page and export only their own data; links to the Privacy Policy and `/me/settings/data` work; a fresh household behaves (empty export, no crash).
- `react-doctor` — no score regression; `nextjs-missing-metadata` satisfied by `generateMetadata`.

---

## Acceptance criteria (from the source plan)

- ✅ Copy matches backend behavior (verified against the WS0 answers, at ship time).
- ✅ No privacy overclaiming — none of the three forbidden statements appears anywhere.
- ✅ The economy GDPR export is self-scoped (caller's own data, `payerId == currentUserId`), on-demand, and uncached; downloads a verbatim JSON file (empty `transactions: []` still downloads cleanly).
- ✅ Reachable, membership-gated (owner and member), and cross-links to the account-level data/erasure surface — without duplicating erasure or implying household-wide export.

---

## Contract appendix — Phase 7 request/response shapes (current snapshot; behaviors ⚠️ unverified)

| Operation                  | Key fields                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exportEconomyGdpr` (GET)  | query `{ householdId }` → `200 ExportEconomyGdprResponse { householdId, exportedAt, data }`. ✅ **Self-scoped** (`payerId == currentUserId`). `data.transactions[]` per-tx: `transactionId, householdId, accountId, categoryId, amount, currency, occurredOn, note, kind, hasReceipt, subscriptionId, transferId, isTransferOutflow, isPending`. No receipt files/blob keys (`hasReceipt` boolean). Fresh household → `data.transactions: []` (200). Download verbatim; no inline render. |
| `exportPersonalData` (GET) | (existing, `/me/settings/data`) no params → `ExportPersonalDataResponse { exports: PersonalDataExport[] }`. Account-level — link to it, don't reimplement.                                                                                                                                                                                                                                                                                                                                |
| `getLegalDocument` (GET)   | (existing) the versioned **Privacy Policy** legal artifact — link to it; distinct from this disclosure page.                                                                                                                                                                                                                                                                                                                                                                              |

> No money, no charts, no SEK formatting on this surface. The only network call is the on-demand
> export `GET` (uncached). There are no Phase-7-specific error codes. The single highest risk is
> **stale copy**: encryption is **not live** (confirmed 2026-06-11) and has **no runtime flag** —
> keep the claim in one i18n key and re-confirm it with the backend at every release until field
> encryption ships, then flip that one key.
