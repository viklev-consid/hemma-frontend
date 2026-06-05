# components/ui — shadcn + Base UI primitives

These files are shadcn-managed wrappers around **Base UI** (`@base-ui/react`)
primitives. They are intended to be modified through the shadcn CLI, not edited
by hand unless the deviation is small and well-justified.

Style: `base-lyra` (Tailwind v4). Match the existing component patterns;
do not introduce a parallel design system.

## Base UI composition rules — read this before placing a primitive

Base UI organizes its primitives by **React context providers**. Several
"part" components require a matching ancestor at runtime and will **throw on
first render** if placed standalone. TypeScript cannot catch these — the only
signal is a runtime error like:

```
Base UI: MenuGroupRootContext is missing.
Menu group parts must be used within <Menu.Group>.
```

The wrappers in this folder don't reproduce Base UI's runtime checks, so the
same rules apply to the shadcn-named exports. Place the ancestor first.

### Required ancestors (cheat sheet)

| Part                                                 | Required ancestor                                | Shadcn wrapper(s)                                                                       |
| ---------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `Menu.GroupLabel`                                    | `Menu.Group` or `Menu.RadioGroup` (since v1.5.0) | `DropdownMenuLabel` → must sit inside `DropdownMenuGroup` (or `DropdownMenuRadioGroup`) |
| `Menu.RadioItem`                                     | `Menu.RadioGroup`                                | `DropdownMenuRadioItem` → `DropdownMenuRadioGroup`                                      |
| `Menu.CheckboxItem`                                  | (none — works at top level of `Menu.Popup`)      | `DropdownMenuCheckboxItem`                                                              |
| `Tabs.Tab`                                           | `Tabs.List`                                      | `TabsTrigger` → `TabsList`                                                              |
| `Tabs.Panel`                                         | `Tabs.Root`                                      | `TabsContent` → `Tabs`                                                                  |
| `RadioGroup.Item`                                    | `RadioGroup.Root`                                | `RadioGroupItem` → `RadioGroup`                                                         |
| `Accordion.Item`                                     | `Accordion.Root`                                 | `AccordionItem` → `Accordion`                                                           |
| `Accordion.Trigger` / `Accordion.Panel`              | `Accordion.Item`                                 | `AccordionTrigger` / `AccordionContent` → inside `AccordionItem`                        |
| `Combobox.List` / `Combobox.Item`                    | `Combobox.Root`                                  | `ComboboxList` / `ComboboxItem` → `Combobox`                                            |
| `Select.Item`                                        | `Select.Root` (via `SelectContent`)              | `SelectItem` → `SelectContent`                                                          |
| `Toolbar.Button` / `Toolbar.Group`                   | `Toolbar.Root`                                   | (no shadcn wrapper yet — open Base UI directly)                                         |
| `NavigationMenu.*` parts                             | `NavigationMenu.Root`                            | (no shadcn wrapper yet)                                                                 |
| `Form.Field` parts (`Field.Label`, `Field.Error`, …) | `Field.Root`                                     | `FieldLabel` / `FieldError` → `Field`                                                   |

When in doubt: open the primitive file in `components/ui/`, look at what
Base UI part the wrapper re-exports, then check the
[Base UI docs](https://base-ui.com/react/components) for that part's
composition diagram.

### Why the type system doesn't catch this

Base UI types accept the parts as standalone JSX because they're styled
components — TypeScript can't follow the React context dependency. The check
is an internal `useContext`/`React.use` lookup that throws at render time.

### Verification habit when touching menus / dialogs / forms

After any change to a dropdown / menu / accordion / tab / form structure,
**actually mount the surface in dev mode** (or in a Vitest render smoke).
Static checks will not catch composition bugs. The PreCommit hook does not
catch them either; only runtime rendering will.

## Conventions for shadcn wrappers

- **`render={<X />}` slot pattern**: prefer this Base UI pattern over the
  earlier `asChild` style. The slot is the child element that receives the
  primitive's behavior, props, and refs. Mismatched HTML elements (e.g. a
  `<Link>` inside a `<Button>` that itself renders an `<a>`) will fail a
  React validation — pass `nativeButton={false}` if you intentionally render
  the primitive as a different tag.

- **`forwardRef` is not needed**: React 19. Pass `ref` as a regular prop.

- **`cn` for class merging**: import from `@/lib/utils` and merge upstream
  class names last so callers can override. Never replace the className
  baseline silently.

- **Icons**: `lucide-react`. Place inside the part body, not the wrapper,
  unless the wrapper has a canonical icon slot (e.g. `DropdownMenuItem` does
  not — pass the icon as a child).

## When the shadcn CLI changes one of these files

The CLI overwrites in place. If you've added project-specific behavior to a
primitive, capture it as a comment block at the top of the file explaining
what diverged from the shadcn upstream and why, so the next regeneration
doesn't silently drop the change.
