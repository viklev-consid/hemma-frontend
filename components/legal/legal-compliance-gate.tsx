"use client";

import "@/api/client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type {
  AcceptedLegalDocumentRequest,
  LegalComplianceDocumentResponse,
} from "@/api/generated";
import {
  acceptLegalDocumentsMutation,
  getLegalComplianceOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { currentUserQueryKey } from "@/lib/auth-query";
import {
  onLegalComplianceRequired,
  type MissingLegalDocument,
} from "@/api/problems";
import { useAuth } from "@/components/auth-provider";
import {
  LegalAcceptanceForm,
  type LegalDocumentInput,
} from "@/components/legal/legal-acceptance-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function toFormInput(
  doc: LegalComplianceDocumentResponse | MissingLegalDocument,
): LegalDocumentInput | null {
  if (!("markdown" in doc) || !doc.markdown) return null;
  return {
    id: doc.id,
    type: doc.type,
    title: doc.title,
    version: doc.version,
    contentHash: doc.contentHash,
    markdown: doc.markdown,
  };
}

export function LegalComplianceGate() {
  const t = useTranslations("components.legal.gate");
  const queryClient = useQueryClient();
  const { isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => onLegalComplianceRequired(() => setOpen(true)), []);

  useEffect(() => {
    if (!open) return;
    function onFocus() {
      void queryClient.invalidateQueries({
        queryKey: getLegalComplianceOptions().queryKey,
      });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [open, queryClient]);

  const complianceQuery = useQuery({
    ...getLegalComplianceOptions(),
    enabled: open && isAuthenticated,
    staleTime: 0,
    // Opt out of the global 428 handler so a 428 from the gate's own
    // endpoint cannot re-fire the gate event and lock the user in.
    meta: { skipLegalGate: true },
  });

  // Cross-tab sync: when the compliance query reports compliant, hide the
  // dialog via derived state (no setState-in-effect) and refresh the current
  // user once so any consumer sees the new compliance status.
  const isCompliantAfterRefetch = complianceQuery.data?.isCompliant === true;
  const dialogOpen = open && !isCompliantAfterRefetch;
  useEffect(() => {
    if (open && isCompliantAfterRefetch) {
      void queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    }
  }, [open, isCompliantAfterRefetch, queryClient]);

  const acceptMutation = useMutation({
    ...acceptLegalDocumentsMutation(),
    meta: { skipLegalGate: true },
    onSuccess: async () => {
      setSubmitError(null);
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getLegalComplianceOptions().queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: currentUserQueryKey }),
      ]);
    },
  });

  const documents: LegalDocumentInput[] = (
    complianceQuery.data?.missingDocuments ?? []
  ).flatMap((doc) => {
    const input = toFormInput(doc);
    return input ? [input] : [];
  });

  async function handleAccept(accepted: AcceptedLegalDocumentRequest[]) {
    setSubmitError(null);
    try {
      await acceptMutation.mutateAsync({
        body: { acceptedDocuments: accepted },
      });
    } catch (error) {
      const problem = error as {
        status?: number;
        title?: string;
        detail?: string;
      };
      if (problem?.status === 400) {
        await queryClient.invalidateQueries({
          queryKey: getLegalComplianceOptions().queryKey,
        });
        setSubmitError(t("loadError"));
        return;
      }
      setSubmitError(problem?.detail ?? problem?.title ?? t("loadError"));
    }
  }

  if (!isAuthenticated) return null;

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(nextOpen) => {
        // Modal must stay open until the user accepts or uses an escape hatch
        // (logout / manage account). Ignore programmatic-close attempts.
        if (nextOpen) setOpen(true);
      }}
      disablePointerDismissal
    >
      <DialogContent className="max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {complianceQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : complianceQuery.isError || documents.length === 0 ? (
          <p className="text-sm text-destructive" role="alert">
            {t("loadError")}
          </p>
        ) : (
          <LegalAcceptanceForm
            documents={documents}
            submitLabel={t("submit")}
            submitting={acceptMutation.isPending}
            errorMessage={submitError ?? undefined}
            onSubmit={handleAccept}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <Link
            href="/app/me/settings"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            onClick={() => {
              // The gate is rendered inside the (app) layout, so client-side
              // navigation does not unmount it. Close manually so the user can
              // reach settings (data export, delete account) without the modal
              // shadowing the next page.
              setSubmitError(null);
              setOpen(false);
            }}
          >
            {t("manageAccount")}
          </Link>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            {t("logout")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
