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
| CSV parsing (browser)           | PapaParse (`papaparse`)                    | `csv-parser` (Node-stream-only), hand-rolled |

## CSV parsing — PapaParse

The economy CSV import parses the file **in the browser** (there is no
multipart upload endpoint; rows are normalized client-side and submitted as
JSON). PapaParse is browser-first: it parses `File`/`Blob` directly, strips the
BOM, auto-detects `,`/`;` delimiters, and handles quoted/embedded newlines —
exactly what real Swedish bank exports need. `csv-parser` was rejected: it's a
Node _streaming_ parser (`fs.createReadStream(...).pipe(...)`) with no browser
build, so it would need stream polyfills and still lack the niceties.

Keep PapaParse isolated behind `lib/economy/csv-parse.ts` so the import wizard
stays parser-agnostic and the seam is unit-testable.
