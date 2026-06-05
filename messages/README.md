# Messages

User-facing strings for the app, organized by namespace.

## Layout

One JSON file per top-level namespace. The file basename **is** the namespace
key — e.g. `auth.json` is loaded under `auth`, so `t('auth.login.title')`
reads `auth.json` → `login.title`.

| File                   | Scope                                               |
| ---------------------- | --------------------------------------------------- |
| `common.json`          | Generic labels (Save, Cancel, Loading, …)           |
| `metadata.json`        | Page titles and descriptions for `generateMetadata` |
| `errors.json`          | Toast strings from `api/problems.ts`, boundaries    |
| `marketing.json`       | `app/(marketing)/*`                                 |
| `auth.json`            | `app/(public)/*` auth pages                         |
| `authComponents.json`  | `components/auth/*`                                 |
| `onboarding.json`      | `app/(onboarding)/*`                                |
| `app.json`             | `app/(app)/app/*` top-level pages                   |
| `settings.json`        | `app/(app)/app/me/settings/*` pages                 |
| `settingsForms.json`   | `components/settings/*` forms                       |
| `admin.json`           | `app/(app)/app/admin/*` pages                       |
| `adminComponents.json` | `components/admin/*`                                |
| `components.json`      | Shared top-level `components/*`                     |

To add a locale: drop a sibling folder (e.g. `messages/sv/`) with the same
file shape, then add it to `LOCALES` in `i18n/locales.ts` and to the
`loaders` map in `i18n/request.ts`.

## Key naming

Dot-separated, lowercase, hierarchical, mirrors the UI structure:

```
auth.login.title
auth.login.form.email.label
auth.login.errors.invalidCredentials
```

## Patterns

**Interpolation:**

```json
{ "greeting": "Hello, {name}" }
```

```ts
t("greeting", { name });
```

**Pluralization (ICU):**

```json
{
  "itemCount": "{count, plural, =0 {No items} one {# item} other {# items}}"
}
```

```ts
t("itemCount", { count });
```

**Rich text (embedded markup):**

```json
{ "terms": "Agree to our <link>terms</link>" }
```

```tsx
t.rich("terms", {
  link: (chunks) => <Link href="/terms">{chunks}</Link>,
});
```

**Dates and numbers:** use the helpers in `lib/formatters.ts`
(`useDateTime`, `formatNumber`, …) rather than calling `Intl.*` directly,
so formatting follows the active locale.
