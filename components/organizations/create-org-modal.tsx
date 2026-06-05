"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CreateOrgForm } from "@/components/organizations/create-org-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Intercepted-route modal wrapper around the shared `<CreateOrgForm/>`.
 *
 * Behaviour:
 * - `onSuccess` — close the modal locally and replace the intercepted
 *   URL with the newly-created org route. The form will already have
 *   invalidated /my.
 * - `onCancel` — same: pop back.
 *
 * The modal is always considered "open" (the route IS the modal). Base
 * UI's Dialog still needs an `open` boolean — we tie its close to the
 * router so any close gesture (overlay click, Escape) navigates back,
 * which causes Next to unmount this slot's route.
 *
 * Hard-refresh on `/app/organizations/new` bypasses the slot entirely
 * and renders the standalone page at `app/(app)/app/organizations/new/`.
 */
export function CreateOrgModal() {
  const { back, replace } = useRouter();
  const [open, setOpen] = useState(true);

  const close = () => {
    setOpen(false);
    // Prefer `back` so the user returns to where they came from. If
    // they hard-typed the URL (no history entry to pop), this is a
    // no-op; in practice the standalone page handles that case.
    back();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-w-xl">
        {/* Visually hidden title for a11y — the form renders its own
            visible heading via the Card primitive. */}
        <DialogTitle className="sr-only">Create organization</DialogTitle>
        <CreateOrgForm
          variant="plain"
          onSuccess={(data) => {
            setOpen(false);
            // Replace the intercepted modal URL so the dialog unmounts and
            // the browser history does not keep a stale modal entry.
            replace(`/app/o/${data.slug}`);
          }}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
