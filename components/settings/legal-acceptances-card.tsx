"use client";

import "@/api/client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";

import { getLegalComplianceOptions } from "@/api/generated/@tanstack/react-query.gen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { parseIsoDate, useHumanizeLegalType } from "@/lib/legal";

import { LegalDocumentSheet } from "./legal-document-sheet";

type ActiveDoc = { type: string; version: string; acceptedAt: string };

export function LegalAcceptancesCard() {
  const t = useTranslations("settingsForms.data.legal.accepted");
  const format = useFormatter();
  const humanizeLegalType = useHumanizeLegalType();
  const [active, setActive] = useState<ActiveDoc | null>(null);

  const complianceQuery = useQuery({
    ...getLegalComplianceOptions(),
  });

  const pendingTypes = useMemo(
    () =>
      new Set(
        complianceQuery.data?.missingDocuments?.map((doc) => doc.type) ?? [],
      ),
    [complianceQuery.data?.missingDocuments],
  );

  const accepted = useMemo(() => {
    const list = complianceQuery.data?.acceptedDocuments ?? [];
    // Newest first so the most relevant acceptance is at the top.
    return list.toSorted(
      (a, b) =>
        parseIsoDate(b.acceptedAt).getTime() -
        parseIsoDate(a.acceptedAt).getTime(),
    );
  }, [complianceQuery.data?.acceptedDocuments]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {complianceQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : complianceQuery.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {t("loadError")}
            </p>
          ) : accepted.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-border border border-border">
              {accepted.map((doc) => {
                const hasUpdate = pendingTypes.has(doc.type);
                return (
                  <li
                    key={`${doc.type}@${doc.version}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {humanizeLegalType(doc.type)}
                        </span>
                        <Badge variant="outline">
                          {t("versionLabel", { version: doc.version })}
                        </Badge>
                        {hasUpdate ? (
                          <Badge variant="destructive">
                            {t("updateAvailable")}
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("acceptedLabel", {
                          date: format.dateTime(parseIsoDate(doc.acceptedAt), {
                            dateStyle: "medium",
                          }),
                        })}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setActive({
                          type: doc.type,
                          version: doc.version,
                          acceptedAt: doc.acceptedAt,
                        })
                      }
                      aria-label={`${t("view")} ${humanizeLegalType(doc.type)} ${doc.version}`}
                    >
                      {t("view")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {active ? (
        <LegalDocumentSheet
          mode="view"
          open={active !== null}
          onOpenChange={(next) => {
            if (!next) setActive(null);
          }}
          type={active.type}
          version={active.version}
          acceptedAt={active.acceptedAt}
        />
      ) : null}
    </>
  );
}
