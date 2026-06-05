"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { setProblemLabels } from "@/api/problems";

export function ProblemLabelsInit() {
  const t = useTranslations("errors");

  useEffect(() => {
    setProblemLabels({
      generic: {
        title: t("generic.title"),
        description: t("generic.description"),
      },
      failed: t("failed"),
      invalidValue: t("invalidValue"),
    });
  }, [t]);

  return null;
}
