# 0006 - Verify Changes By Risk And Boundary

Date: 2026-05-13

Status: Accepted

## Context

Agent-driven development is fast enough that regressions can be introduced before intent is fully re-read. The repository therefore needs verification rules that are easy to select based on the files touched.

## Decision

Every meaningful implementation change should be verified with the narrowest checks that cover the risk:

| Change Type                                                       | Required Verification                             |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| Any TypeScript or TSX change                                      | `pnpm typecheck` and `pnpm lint`                  |
| Area with tests or behavior logic                                 | `pnpm test --run`                                 |
| UI component change                                               | React Doctor diff check                           |
| `app/api/**` route change                                         | BFF route security review plus relevant tests     |
| Permission-gated UI change                                        | Permission string review against backend contract |
| Middleware/proxy, layout, route, or server/client boundary change | `pnpm build`                                      |
| API contract/client change                                        | `pnpm api:generate`, then typecheck/lint/tests    |

Use `pnpm` for all package scripts.

## Consequences

Verification cost scales with risk. Small changes stay lightweight, while boundary changes get build-time and security-focused checks.

Agents have an explicit checklist and should not guess which checks count as done.

## Agent Guidance

Run checks before declaring work complete. If a check cannot run because of missing services, network restrictions, or unavailable credentials, say exactly which check could not be verified and why.

Do not treat generated API files as manually fixable lint/typecheck failures. Regenerate them from the contract.

For UI work, fix React Doctor issues introduced by the change. If a rule is a true false positive, document why in the final summary or commit message.
