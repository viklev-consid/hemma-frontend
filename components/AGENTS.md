# components — patterns shared across feature folders

## Intercepted modals — the `@modal` slot recipe

We use the Next App Router's parallel-routes + intercepting-routes
combination to give certain create flows a dual life:

- A **standalone page** that anyone can deep-link, refresh, or share.
- An **intercepted modal** when reached via in-app `<Link>` navigation —
  same URL, but rendered as a dialog over whatever the user was looking
  at, with `back()` closing it cleanly.

The convention is documented in
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/intercepting-routes.md`
and `parallel-routes.md`. Read them before adding another modal; the
geometry is non-obvious.

### File layout (current: create-org)

```
app/(app)/app/
├── layout.tsx                      — accepts { children, modal } and renders both
├── @modal/
│   ├── default.tsx                 — returns null (slot fallback for hard nav)
│   └── (.)organizations/new/page.tsx  — intercepts the create-org route
└── organizations/new/page.tsx      — standalone page (direct URL hit / refresh)
```

The `(.)` matcher is segment-relative — and **slots are not segments**.
So from inside `@modal/` the `organizations` segment is one segment
away (same level as `@modal`'s host layout's children), which is why
`(.)organizations/new/` is correct. `(..)` would be wrong here.

### Form sharing

The form component is shared between the two surfaces. The standalone
page mounts it bare; the modal wraps it in `<Dialog>`. To keep the form
oblivious to which chrome it's in, the form exposes optional handlers:

```tsx
<CreateOrgForm
  onSuccess={(data) => push(`/app/o/${data.slug}`)}
  onCancel={close}
/>
```

When `onSuccess` / `onCancel` are omitted (standalone usage), the form
falls back to its default navigation. The modal supplies them so the
"success" path navigates into the new resource (which also unmounts the
slot) and "cancel" pops back to the originating route.

### Adding a new intercepted modal

1. Add the standalone page at `app/(app)/app/<segment>/<sub>/page.tsx`
   (or under `o/[slug]/...` if it's org-scoped).
2. Make the form component accept optional `onSuccess` and `onCancel`.
3. Add a modal wrapper at `components/<feature>/<name>-modal.tsx` that
   pulls the form in with the `Dialog` chrome.
4. Add the intercept under the existing slot — for `/app/X/Y`, the file
   is `app/(app)/app/@modal/(.)X/Y/page.tsx`. For depth `/app/X/Y/Z`,
   the matcher becomes `(.)X/Y/Z` since slots aren't counted.
5. Test all three paths: `<Link>` from inside the app (modal), hard
   refresh on the modal URL (standalone), back navigation closes
   cleanly.

### Hard rules

- **Never** introduce hand-rolled global modal state for this. The
  parallel-route mechanism is the contract. Adding a Zustand store /
  context that toggles `open` will deadlock with the slot's lifecycle.
- The slot **only** intercepts client-side navigations. Server-side
  redirects and hard URLs hit the standalone page. Both surfaces must
  work standalone — no shared parent that the modal silently depends on.
- The slot's `default.tsx` must exist and return null. Without it,
  hard-nav refreshes fall through to a 404 on the slot side, which
  Next surfaces by 404'ing the whole route.
