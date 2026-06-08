# Code generation — OpenAPI pipeline

Types are generated, not hand-written. The OpenAPI spec is the single source of truth.

- `openapi.json` is **committed** in the repo as the contract snapshot.
- `pnpm api:sync` — fetches the spec from the running backend (`https://localhost:7297/openapi/v1.json`).
- `pnpm api:generate` — runs `@hey-api/openapi-ts` against the local `openapi.json`, outputs to `api/generated/`.
- **Never hand-edit files in `api/generated/`** — they are overwritten on every codegen run.
- CI runs `api:generate` against the committed spec. Builds are fully decoupled from the backend.

## Generated outputs

| Output                 | Plugin                    | Used by                                                   |
| ---------------------- | ------------------------- | --------------------------------------------------------- |
| TypeScript interfaces  | `@hey-api/types`          | Everything                                                |
| Zod validation schemas | `@hey-api/zod`            | TanStack Forms (client validation matching backend rules) |
| React Query hooks      | `@hey-api/tanstack-query` | Components (`useQuery` / `useMutation` wrappers)          |
| Fetch client           | `@hey-api/fetch`          | BFF proxy (typed fetch to .NET API)                       |
