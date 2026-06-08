# 0005 - Standardize The Frontend Application Stack

Date: 2026-05-13

Status: Accepted

## Context

This app is intended to be a reusable, agent-friendly frontend companion to the Hemma backend. Consistency matters more than local preference because future features should compose predictably.

## Decision

The project standardizes on these choices:

| Need                  | Use                                           | Avoid                                              |
| --------------------- | --------------------------------------------- | -------------------------------------------------- |
| Routing and rendering | Next.js App Router                            | Pages Router                                       |
| Server state          | Server prefetch plus TanStack Query hydration | `useEffect` plus local state for server data, SWR  |
| Forms                 | TanStack Form plus generated Zod schemas      | React Hook Form, duplicate hand-written schemas    |
| Tables                | TanStack Table                                | One-off table state systems                        |
| URL state             | `nuqs`                                        | Manual `useSearchParams` parsing for complex state |
| Styling               | Tailwind CSS v4 and shadcn/ui tokens          | CSS modules, styled-components, new design systems |
| Component primitives  | Existing `components/ui` shadcn components    | MUI, Chakra, Ant Design                            |
| Icons                 | `lucide-react`                                | New icon packs                                     |
| Toasts                | Sonner                                        | `window.alert`, custom toast systems               |
| Theme                 | `next-themes`                                 | Manual theme class management                      |
| API client            | Hey API generated client via `/api/proxy`     | Direct browser calls to backend                    |

React 19 conventions are part of the stack decision:

- Prefer `use(Context)` over `useContext(Context)` in new React code where applicable.
- Prefer `ref` as a prop over `forwardRef`.
- Keep `"use client"` boundaries as small as practical.

Route-critical reads should start on the server and hydrate React Query when client interactivity still needs generated `useQuery` options. Client-only queries are reserved for hidden, lazy, polling, or strongly interactive surfaces.

## Consequences

Feature code should look similar across modules. Agents can infer patterns safely and avoid importing new libraries for solved problems.

The tradeoff is that some features require learning the selected tools rather than reaching for a familiar alternative.

## Agent Guidance

Before adding a dependency, check whether the stack already has a project-approved tool for the job. Prefer existing shadcn/ui components from `components/ui`.

Use `cn` from `@/lib/utils` for class merging and `@/*` imports for project modules.

For UI work, match the existing Tailwind v4 token usage and `base-lyra` shadcn style. Do not introduce a parallel visual language for a single feature.
