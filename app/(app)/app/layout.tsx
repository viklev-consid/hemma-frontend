import type { ReactNode } from "react";

/**
 * Hosts the `@modal` parallel slot so any route under `/app/...` can be
 * intercepted into a modal. Today only `/app/organizations/new` uses
 * this; the pattern is reusable for future create flows (see
 * `components/CLAUDE.md` for the recipe).
 *
 * Per Next docs, slots are NOT route segments and don't affect URL
 * structure — they're rendered alongside `children` by the consuming
 * layout. On a hard refresh the slot falls back to its `default.tsx`
 * (which returns null), so the underlying standalone route renders
 * unmodulated.
 */
export default function AppLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
