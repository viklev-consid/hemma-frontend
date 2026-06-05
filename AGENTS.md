<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# Project conventions

- Use `pnpm` for all package and script commands.
- Prefer App Router patterns in the root `app/` directory.
- Use the `@/*` path alias, which maps to the repository root.
- Reuse existing shadcn/ui components from `components/ui` before adding new primitives.
- Use `lucide-react` for icons.
- Use `cn` from `@/lib/utils` for class merging.
- For API client/types changes, do not hand-edit generated files in `api/generated`; update `openapi.json` and run `pnpm api:generate`.
- Validate meaningful changes with the narrowest relevant checks:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build` for Next.js routing, server/client boundary, or production behavior changes.
- Keep tests as `*.test.ts` or `*.test.tsx`; Vitest runs in jsdom with setup from `tests/setup.ts`.

# UI conventions

- This app uses Tailwind CSS v4 and shadcn style `base-lyra`; match the existing component style and token usage.
- Avoid adding new design systems or one-off component libraries unless explicitly requested.

# Generated/API workflow

- `pnpm api:sync` expects the backend OpenAPI endpoint at `http://localhost:5000/openapi/v1.json`.
- If the backend is unavailable, explain that API sync could not be verified instead of fabricating generated output.
- Files in `api/generated/` are protected by a PreToolUse hook — edits are mechanically blocked. If a generated type is wrong, update `openapi.json` and run `pnpm api:generate`.

# Post-implementation verification protocol

After completing any task, run the applicable checks before considering the work done:

1. **Always:** `pnpm typecheck` and `pnpm lint` (automated by PostToolUse hooks on every edit)
2. **If tests exist for the changed area:** `pnpm test --run`
3. **If UI components changed:** `npx -y react-doctor@latest . --verbose --diff` — check that the score did not regress
4. **If API routes changed (`app/api/**`):** Run the `bff-route-review` skill to verify session handling, error mapping, and token security
5. **If permission-gated UI changed:** Run the `permission-review` skill to validate permission strings against the backend API
6. **If middleware, layouts, or route files changed:** `pnpm build` — routing errors are invisible until build time

Do not skip verification steps. The PreCommit hook runs typecheck + lint + tests + react-doctor automatically, but catching issues earlier (per-file) avoids wasted iteration.

# React Doctor conventions

This project uses [react-doctor](https://github.com/millionco/react-doctor) for health scoring. The config (`doctor.config.json`) excludes `api/generated/**` since those files are auto-generated.

Rules to pay attention to when writing React code:

- **`no-react19-deprecated-apis`** — Use `use(Context)` not `useContext(Context)`. Use `ref` as a prop, not `forwardRef`. This aligns with the React 19 conventions in CLAUDE.md.
- **`react-compiler-destructure-method`** — Destructure hook return values: `const { push } = useRouter()` then `push(...)`, not `router.push(...)`. This helps React Compiler memoization.
- **`nextjs-missing-metadata`** — Every page should export `metadata` or `generateMetadata` for SEO.
- **`no-prevent-default`** — Avoid `e.preventDefault()` on form `onSubmit` when possible. Note: TanStack Forms requires this pattern, so it's acceptable in form components that use `form.handleSubmit()`.
- **`no-array-index-as-key`** — Use stable IDs as keys, not array indices.
- **`no-derived-useState`** — Don't initialize `useState` from props. Derive during render instead.
- **`no-danger`** — Never use `dangerouslySetInnerHTML` without explicit justification.
- **`no-secrets-in-client-code`** — Never hardcode tokens, API keys, or secrets in client components.

When react-doctor flags an issue in your code, fix it before committing. If a rule is a false positive for a specific case, explain why in your commit message.

# BFF route security checklist

When creating or modifying API routes under `app/api/`:

- Auth routes use `getSession()` and `problemResponse()` from `@/lib/backend`
- Only `publicUser()` data is returned to the client (never tokens)
- `host` and `cookie` headers are stripped from forwarded requests
- `export const dynamic = "force-dynamic"` is set (no caching of auth responses)
- Error responses do not leak account enumeration (login errors are generic)
- No raw stack traces in error responses
