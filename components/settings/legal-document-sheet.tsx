"use client";

import "@/api/client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";

import {
  acceptLegalDocumentsMutation,
  getLegalComplianceOptions,
  getLegalDocumentOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import type { ProblemDetails } from "@/api/problems";
import { LegalMarkdown } from "@/components/legal/legal-markdown";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { currentUserQueryKey } from "@/lib/auth-query";
import { parseIsoDate } from "@/lib/legal";

export type LegalDocumentSheetMode = "view" | "accept";

type CommonProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  type: string;
  version: string;
  // Optional metadata only used in view mode — when present, the sheet can
  // show "Accepted on …" without waiting for the lazy fetch to finish.
  acceptedAt?: string;
};

type ViewProps = CommonProps & {
  mode: "view";
  documentId?: never;
  contentHash?: never;
  onAccepted?: never;
};

type AcceptProps = CommonProps & {
  mode: "accept";
  documentId: string;
  contentHash: string;
  onAccepted: () => void;
};

export type LegalDocumentSheetProps = ViewProps | AcceptProps;

export function LegalDocumentSheet(props: LegalDocumentSheetProps) {
  const { open, onOpenChange, type, version } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        {/* Keying on (type,version) remounts the inner body so per-document
            state (acknowledgement, submit error) resets without a
            setState-in-effect. */}
        <LegalDocumentSheetBody
          key={`${type}@${version}@${props.contentHash ?? ""}`}
          {...props}
        />
      </SheetContent>
    </Sheet>
  );
}

function LegalDocumentSheetBody(props: LegalDocumentSheetProps) {
  const { open, type, version, mode } = props;
  const t = useTranslations("settingsForms.data.legal.sheet");
  const format = useFormatter();
  const queryClient = useQueryClient();

  const documentQuery = useQuery({
    ...getLegalDocumentOptions({ path: { type, version } }),
    enabled: open,
    // (type, version) is immutable — once fetched, never goes stale. Let
    // React Query GC the entry when no observers remain (default behaviour).
    staleTime: Infinity,
    // Don't retry on terminal errors: a 404 means the version isn't
    // published (e.g. the user is viewing an older acceptance that the
    // backend no longer exposes) and retrying just wastes bandwidth.
    retry: (failureCount, error) => {
      const status = (error as { status?: number } | null)?.status;
      if (status === 404 || status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });

  const documentNotFound =
    documentQuery.isError &&
    (documentQuery.error as { status?: number } | null)?.status === 404;

  const [acknowledged, setAcknowledged] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const acceptMutation = useMutation({
    ...acceptLegalDocumentsMutation(),
    meta: { skipLegalGate: true },
  });

  async function handleAccept() {
    if (props.mode !== "accept" || !acknowledged) return;
    setSubmitError(null);
    try {
      await acceptMutation.mutateAsync({
        body: {
          acceptedDocuments: [
            {
              documentId: props.documentId,
              version,
              contentHash: props.contentHash,
            },
          ],
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getLegalComplianceOptions().queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: currentUserQueryKey }),
      ]);
      props.onAccepted();
    } catch (error) {
      const problem = error as ProblemDetails;
      if (problem?.status === 400) {
        await queryClient.invalidateQueries({
          queryKey: getLegalComplianceOptions().queryKey,
        });
        setSubmitError(t("acceptError"));
        return;
      }
      setSubmitError(problem?.detail ?? problem?.title ?? t("acceptError"));
    }
  }

  const data = documentQuery.data;
  const sheetTitle = data?.title ?? t("loadingTitle");

  return (
    <>
      <SheetHeader className="border-b border-border">
        <SheetTitle>{sheetTitle}</SheetTitle>
        <SheetDescription>
          {t("versionLabel", { version })}
          {data?.publishedAt
            ? ` · ${t("publishedLabel", {
                date: format.dateTime(parseIsoDate(data.publishedAt), {
                  dateStyle: "medium",
                }),
              })}`
            : ""}
          {data?.effectiveAt
            ? ` · ${t("effectiveLabel", {
                date: format.dateTime(parseIsoDate(data.effectiveAt), {
                  dateStyle: "medium",
                }),
              })}`
            : ""}
          {props.acceptedAt
            ? ` · ${t("acceptedLabel", {
                date: format.dateTime(parseIsoDate(props.acceptedAt), {
                  dateStyle: "medium",
                }),
              })}`
            : ""}
        </SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {documentQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : documentNotFound ? (
            <p className="text-sm text-muted-foreground" role="alert">
              {t("notFound")}
            </p>
          ) : documentQuery.isError || !data ? (
            <p className="text-sm text-destructive" role="alert">
              {t("loadError")}
            </p>
          ) : (
            <LegalMarkdown content={data.markdown} />
          )}
        </div>
      </ScrollArea>

      <SheetFooter className="border-t border-border">
        {mode === "accept" && data ? (
          <>
            <Field orientation="horizontal">
              <Checkbox
                id={`legal-ack-${type}-${version}`}
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <FieldContent>
                <FieldLabel
                  htmlFor={`legal-ack-${type}-${version}`}
                  className="text-xs"
                >
                  {t("acknowledge", { title: data.title })}
                </FieldLabel>
              </FieldContent>
            </Field>
            {submitError ? (
              <p className="text-xs text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <SheetClose
                render={
                  <Button type="button" variant="ghost">
                    {t("cancel")}
                  </Button>
                }
              />
              <Button
                type="button"
                onClick={() => void handleAccept()}
                disabled={!acknowledged || acceptMutation.isPending}
              >
                {acceptMutation.isPending ? t("accepting") : t("accept")}
              </Button>
            </div>
          </>
        ) : (
          <SheetClose
            render={
              <Button type="button" variant="outline">
                {t("close")}
              </Button>
            }
          />
        )}
      </SheetFooter>
    </>
  );
}
