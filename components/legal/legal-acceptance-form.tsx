"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { AcceptedLegalDocumentRequest } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { LegalMarkdown } from "./legal-markdown";

export type LegalDocumentInput = {
  id: string;
  type: string;
  title: string;
  version: string;
  contentHash: string;
  markdown: string;
};

type LegalAcceptanceFormProps = {
  documents: LegalDocumentInput[];
  submitting?: boolean;
  submitLabel: string;
  errorMessage?: string;
  onSubmit: (
    acceptedDocuments: AcceptedLegalDocumentRequest[],
  ) => void | Promise<void>;
  extraFields?: React.ReactNode;
  className?: string;
};

export function LegalAcceptanceForm({
  documents,
  submitting,
  submitLabel,
  errorMessage,
  onSubmit,
  extraFields,
  className,
}: LegalAcceptanceFormProps) {
  const t = useTranslations("components.legal.acceptance");
  const [ackById, setAckById] = useState<Record<string, boolean>>({});

  const allAcknowledged = useMemo(
    () => documents.length > 0 && documents.every((doc) => ackById[doc.id]),
    [ackById, documents],
  );

  function toggle(id: string, checked: boolean) {
    setAckById((prev) => ({ ...prev, [id]: checked }));
  }

  async function handleSubmit() {
    if (!allAcknowledged || submitting) return;
    const payload: AcceptedLegalDocumentRequest[] = documents.map((doc) => ({
      documentId: doc.id,
      version: doc.version,
      contentHash: doc.contentHash,
    }));
    await onSubmit(payload);
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="space-y-4">
        {documents.map((doc) => (
          <DocumentPanel
            key={doc.id}
            doc={doc}
            acknowledged={Boolean(ackById[doc.id])}
            onAcknowledgeChange={(checked) => toggle(doc.id, checked)}
          />
        ))}
      </div>

      {extraFields}

      {errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="button"
        className="w-full"
        onClick={() => void handleSubmit()}
        disabled={!allAcknowledged || submitting}
      >
        {submitLabel}
      </Button>

      {!allAcknowledged && documents.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {t("acknowledgeAllHint")}
        </p>
      ) : null}
    </div>
  );
}

type DocumentPanelProps = {
  doc: LegalDocumentInput;
  acknowledged: boolean;
  onAcknowledgeChange: (checked: boolean) => void;
};

function DocumentPanel({
  doc,
  acknowledged,
  onAcknowledgeChange,
}: DocumentPanelProps) {
  const t = useTranslations("components.legal.acceptance");
  const ackId = `legal-ack-${doc.id}`;

  return (
    <div className="border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="text-sm font-semibold text-foreground">
          {doc.title}
        </span>
        <span className="border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {t("versionLabel", { version: doc.version })}
        </span>
      </div>
      <ScrollArea className="h-56 p-3">
        <LegalMarkdown content={doc.markdown} />
      </ScrollArea>
      <div className="border-t border-border px-3 py-2">
        <Field orientation="horizontal">
          <Checkbox
            id={ackId}
            checked={acknowledged}
            onCheckedChange={(checked) => onAcknowledgeChange(checked === true)}
          />
          <FieldContent>
            <FieldLabel htmlFor={ackId} className="text-xs">
              {t("acknowledgeDocument", { title: doc.title })}
            </FieldLabel>
            <FieldError />
          </FieldContent>
        </Field>
      </div>
    </div>
  );
}
