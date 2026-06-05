# Agent Development Workflow

Use this workflow when implementing changes in this repository.

## Before Editing

1. Read `AGENTS.md`.
2. Read relevant ADRs in `docs/adr`.
3. For Next.js work, read the relevant local docs under `node_modules/next/dist/docs/`.
4. Inspect existing nearby code before choosing a pattern.

## Common File Decisions

| Task                          | Start Here                                            |
| ----------------------------- | ----------------------------------------------------- |
| Add product page              | `app/(app)` once that group exists                    |
| Add public auth-adjacent page | `app/(public)`                                        |
| Add onboarding page/step      | `app/(onboarding)`                                    |
| Add auth BFF behavior         | `app/api/auth/**`, `lib/backend.ts`, `lib/session.ts` |
| Add backend API consumption   | Generated client/hooks via `/api/proxy`               |
| Add reusable UI primitive     | Existing `components/ui` first                        |
| Add feature component         | `components/` or the page directory if page-specific  |
| Add API type/schema behavior  | `openapi.json` and `pnpm api:generate`                |

## BFF Route Checklist

For `app/api/**` changes:

- Use `export const dynamic = "force-dynamic"` for auth/session-sensitive routes.
- Read the session with `getSession()`.
- Never return access tokens or refresh tokens.
- Return only public user data.
- Strip `host` and `cookie` when forwarding backend-bound requests.
- Preserve backend `ProblemDetails` where useful, but avoid account enumeration.
- Avoid raw stack traces in client-visible responses.

## UI Checklist

For UI changes:

- Keep `"use client"` boundaries narrow.
- Prefer existing shadcn/ui components.
- Use `lucide-react` icons.
- Use `cn` for class merging.
- Use Tailwind v4 tokens and existing visual style.
- Avoid new component libraries.
- Export page metadata for new pages.

## Verification

Always run:

```bash
pnpm typecheck
pnpm lint
```

Run additionally when relevant:

```bash
pnpm test --run
pnpm build
npx -y react-doctor@latest . --verbose --diff
pnpm api:generate
```

If a check cannot be run, report the exact blocker.
