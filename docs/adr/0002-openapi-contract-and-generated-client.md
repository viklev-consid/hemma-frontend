# 0002 - Treat OpenAPI As The Frontend Contract Source

Date: 2026-05-13

Status: Accepted

## Context

The backend owns the API shape. This frontend is a contract-driven client that should not drift from backend request and response models.

The repository uses `@hey-api/openapi-ts` configured by `hey-api.config.ts` to generate TypeScript types, Zod schemas, SDK helpers, fetch client code, and TanStack Query bindings from `openapi.json`.

## Decision

The committed `openapi.json` file is the frontend's local contract snapshot. Generated API files are derived artifacts and must not be hand-edited.

The generation pipeline is:

1. Sync the backend OpenAPI document into `openapi.json`.
2. Run Hey API generation with `pnpm api:generate`.
3. Consume generated types, schemas, SDK functions, and query hooks from `api/generated`.

Generated output belongs in `api/generated`, as configured in `hey-api.config.ts`.

## Consequences

Frontend types, client behavior, form schemas, and query hooks remain aligned with backend behavior. Schema and type fixes must be made at the contract source instead of patched in generated code.

This creates a stricter workflow for agents: if a generated type looks wrong, the right fix is usually backend contract work or an `openapi.json` update, followed by code generation.

## Agent Guidance

Do not edit `api/generated/**`.

For API shape changes:

- Update the backend contract or `openapi.json`, depending on the task.
- Run `pnpm api:generate`.
- Review generated diff only to understand impact.
- Update consuming code and tests.

If the backend is unavailable, do not fabricate generated output. Explain that API sync could not be verified and work from the committed `openapi.json` snapshot if that is sufficient.

Prefer generated Zod schemas for form validation when they match the user-facing form shape. Avoid hand-written duplicate DTO types when generated types already exist.
