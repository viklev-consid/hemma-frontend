# 0008 - Track Documentation Drift As A First-Class Maintenance Concern

Date: 2026-05-13

Status: Accepted

## Context

This repository is explicitly optimized for agent-driven development. Agents rely heavily on written conventions, and small documentation mismatches can lead to incorrect file edits, wrong commands, or fabricated generated output.

Some current project docs contain drift that should be resolved deliberately:

- `README.md` says the backend OpenAPI endpoint is `http://localhost:5000/openapi/v1.json`.
- `AGENTS.md` also says `pnpm api:sync` expects `http://localhost:5000/openapi/v1.json`.
- `package.json` currently implements `pnpm api:sync` as `https://localhost:7297/openapi/v1.json`.
- `CLAUDE.md` refers to generated files under `src/api/generated`, while this repository uses `api/generated`.
- `CLAUDE.md` mentions `middleware.ts`, while this Next.js 16 project uses `proxy.ts`.
- `README.md` mentions Base UI primitives, but the practical component convention is to reuse existing shadcn/ui components from `components/ui`.
- The admin shell gates the audit-trail nav on `audit.trail.read`, but `GET /v1/audit/trail` in `openapi.json` documents no required permission. The endpoint defaults to the caller's own trail and only admins can pass `actorId`. Resolution requires either the backend advertising the permission claim or the frontend switching to a different gate; do not silently rename the string without confirming which side is canonical.
- `AuditEntryDto` exposes `id`, `eventType`, `actorId`, `resourceType`, `resourceId`, and `occurredAt` but no `payload` field. The phase 4 admin audit-trail UI was specified to render an expanded JSON detail block (e.g. `oldRole`/`newRole`/`changedBy` for `user.role.changed`). The current expanded view shows only the fields the DTO has — adding payload requires either widening `AuditEntryDto` or exposing a per-event detail endpoint. Do not synthesize fields client-side.

## Decision

Documentation drift should be treated as maintenance work, not harmless prose. When an agent finds a mismatch between docs, scripts, and code, it should either fix the mismatch as part of the task or record it in a relevant ADR/workflow note if the correct source of truth is unclear.

Scripts and checked-in configuration are stronger evidence than prose, but security and architecture docs may intentionally describe a target state. If the discrepancy affects behavior, ask or verify before changing commands.

## Consequences

Future agents have permission to clean up documentation contradictions when they are in the area already being touched.

This ADR also prevents silent normalization of uncertain behavior. For example, the OpenAPI sync endpoint may reflect different backend launch profiles, so it should be resolved intentionally rather than guessed.

## Agent Guidance

When updating docs:

- Prefer exact paths that exist in the repo.
- Keep generated output paths aligned with `hey-api.config.ts`.
- Keep Next.js terminology aligned with the installed version's local docs.
- Mention unresolved drift explicitly in final summaries.

When updating commands:

- Validate the command if possible.
- If a backend service is required and unavailable, state that verification could not be completed.
- Do not fabricate successful sync or generated output.
