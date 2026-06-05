"use client";

import "@/api/client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getLegalComplianceOptions,
  getLegalDocumentQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type {
  GetLegalDocumentResponse,
  LegalComplianceDocumentResponse,
} from "@/api/generated/types.gen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseIsoDate, useHumanizeLegalType } from "@/lib/legal";

import { LegalDocumentSheet } from "./legal-document-sheet";

type ActiveDoc = LegalComplianceDocumentResponse;

export function LegalPendingCard() {
  const t = useTranslations("settingsForms.data.legal.pending");
  const format = useFormatter();
  const humanizeLegalType = useHumanizeLegalType();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveDoc | null>(null);

  const complianceQuery = useQuery({
    ...getLegalComplianceOptions(),
  });

  const missing = useMemo(
    () => complianceQuery.data?.missingDocuments ?? [],
    [complianceQuery.data?.missingDocuments],
  );

  // Cache pre-warming: missingDocuments[] already includes the full markdown
  // and metadata; seeding the per-document cache means the sheet renders
  // immediately on click without firing GetLegalDocument.
  //
  // The compliance payload omits `publishedAt`, but the document response
  // type declares it as required. We seed an empty string — the sheet's
  // header renders the Published line via a truthy check, so an empty
  // string correctly suppresses it (rather than pretending the doc was
  // published on its effective date).
  useEffect(() => {
    for (const doc of missing) {
      const queryKey = getLegalDocumentQueryKey({
        path: { type: doc.type, version: doc.version },
      });
      const cached =
        queryClient.getQueryData<GetLegalDocumentResponse>(queryKey);
      if (cached?.contentHash === doc.contentHash) continue;
      const seeded: GetLegalDocumentResponse = {
        id: doc.id,
        type: doc.type,
        title: doc.title,
        version: doc.version,
        effectiveAt: doc.effectiveAt,
        publishedAt: "",
        contentHash: doc.contentHash,
        markdown: doc.markdown,
      };
      queryClient.setQueryData(queryKey, seeded);
    }
  }, [missing, queryClient]);

  if (complianceQuery.isLoading || complianceQuery.isError) return null;
  if (missing.length === 0) return null;

  return (
    <>
      <Card className="border-amber-500/40">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border border border-border">
            {missing.map((doc) => (
              <li
                key={`${doc.type}@${doc.version}`}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {doc.title}
                    </span>
                    <Badge variant="outline">
                      {t("versionLabel", { version: doc.version })}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("effectiveLabel", {
                      date: format.dateTime(parseIsoDate(doc.effectiveAt), {
                        dateStyle: "medium",
                      }),
                    })}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActive(doc)}
                  aria-label={`${t("viewAndAccept")} ${humanizeLegalType(doc.type)} ${doc.version}`}
                >
                  {t("viewAndAccept")}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {active ? (
        <LegalDocumentSheet
          mode="accept"
          open={active !== null}
          onOpenChange={(next) => {
            if (!next) setActive(null);
          }}
          type={active.type}
          version={active.version}
          documentId={active.id}
          contentHash={active.contentHash}
          onAccepted={() => {
            toast.success(t("acceptSuccess"));
            setActive(null);
          }}
        />
      ) : null}
    </>
  );
}
