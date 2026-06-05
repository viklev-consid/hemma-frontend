# Technology choices

These are deliberate decisions. Do not substitute alternatives.

| Need                            | Use this                                   | NOT this                                     |
| ------------------------------- | ------------------------------------------ | -------------------------------------------- |
| Server state                    | Server prefetch + TanStack Query hydration | `useEffect` + `useState`, SWR                |
| Forms                           | TanStack Forms + generated Zod schemas     | React Hook Form, uncontrolled forms          |
| Data tables                     | TanStack Table                             | Manual `<table>` rendering                   |
| URL state (pagination, filters) | nuqs                                       | `useSearchParams` manually                   |
| Validation                      | Zod (generated from OpenAPI)               | Hand-written schemas, yup                    |
| Session/cookies                 | iron-session                               | next-auth, better-auth, cookies API directly |
| Toasts                          | Sonner (via `sonner` package)              | window.alert, custom toast system            |
| Icons                           | lucide-react                               | heroicons, font-awesome                      |
| Component primitives            | shadcn/ui (already installed)              | MUI, Chakra, Ant Design                      |
| Styling                         | Tailwind CSS v4                            | CSS modules, styled-components               |
| Dark mode                       | next-themes (ThemeProvider)                | Manual class toggling                        |
