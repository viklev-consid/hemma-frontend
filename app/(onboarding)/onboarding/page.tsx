"use client";

import "@/api/client";

import {
  Building2Icon,
  CheckIcon,
  ImageIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type { AcceptedLegalDocumentRequest } from "@/api/generated";
import { getOnboardingLegalRequirementsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { mapProblemToFieldErrors, type ProblemDetails } from "@/api/problems";
import {
  LegalAcceptanceForm,
  type LegalDocumentInput,
} from "@/components/legal/legal-acceptance-form";
import { AvatarUploader } from "@/components/avatar-uploader";
import { useAuth } from "@/components/auth-provider";
import { CreateOrgForm } from "@/components/organizations/create-org-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Step = "terms" | "avatar" | "createOrg" | "complete";

const STEPS: Step[] = ["terms", "avatar", "createOrg", "complete"];

export default function OnboardingPage() {
  const t = useTranslations("onboarding.page");
  const { currentUser, completeOnboarding } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("terms");
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  // The accepted-documents payload is only read inside the submit handler;
  // keeping it in a ref avoids a re-render every time the user advances steps.
  const acceptedDocumentsRef = useRef<AcceptedLegalDocumentRequest[]>([]);
  const [staleDocsMessage, setStaleDocsMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  // Slug of the org the user (optionally) creates in the createOrg
  // step. If set, finishOnboarding lands the user inside that org;
  // otherwise they land on the cross-org dashboard. Stored in a ref —
  // only read in the finishOnboarding event handler, never in render.
  const createdOrgSlugRef = useRef<string | null>(null);

  const legalQuery = useQuery({
    ...getOnboardingLegalRequirementsOptions(),
    staleTime: 0,
  });

  const documents: LegalDocumentInput[] = legalQuery.data?.documents ?? [];

  async function refetchLegal() {
    acceptedDocumentsRef.current = [];
    await queryClient.invalidateQueries({
      queryKey: getOnboardingLegalRequirementsOptions().queryKey,
    });
  }

  function handleTermsSubmit(accepted: AcceptedLegalDocumentRequest[]) {
    acceptedDocumentsRef.current = accepted;
    setStaleDocsMessage(null);
    setFieldErrors({});
    setStep("avatar");
  }

  async function finishOnboarding() {
    setFieldErrors({});
    setSubmitError(null);

    const acceptedDocuments = acceptedDocumentsRef.current;
    if (acceptedDocuments.length === 0) {
      setStep("terms");
      return;
    }

    try {
      const slug = createdOrgSlugRef.current;
      await completeOnboarding(
        {
          acceptMarketingEmails: marketingAccepted,
          acceptedDocuments,
        },
        slug ? { next: `/app/o/${slug}` } : undefined,
      );
    } catch (error) {
      const problem = error as ProblemDetails;
      if (problem.status === 400) {
        await refetchLegal();
        setStaleDocsMessage(t("terms.documentsUpdated"));
        setStep("terms");
        return;
      }
      if (problem.status === 422) {
        setSubmitError(
          problem.detail ?? problem.title ?? t("terms.errorAcceptDocuments"),
        );
        setStep("terms");
        return;
      }
      setFieldErrors(mapProblemToFieldErrors(problem));
      setSubmitError(problem.detail ?? problem.title ?? null);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Stepper activeStep={step} />

          {step === "terms" && (
            <section className="space-y-5">
              {staleDocsMessage ? (
                <p
                  className="border border-border bg-muted/40 px-3 py-2 text-xs text-foreground"
                  role="status"
                >
                  {staleDocsMessage}
                </p>
              ) : null}

              {legalQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  {t("terms.loading")}
                </p>
              ) : legalQuery.isError ? (
                <div className="space-y-3">
                  <p className="text-sm text-destructive" role="alert">
                    {t("terms.loadError")}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void legalQuery.refetch()}
                  >
                    {t("terms.retry")}
                  </Button>
                </div>
              ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("terms.noneRequired")}
                </p>
              ) : (
                <LegalAcceptanceForm
                  documents={documents}
                  submitLabel={t("terms.submit")}
                  errorMessage={
                    fieldErrors.acceptedDocuments ?? submitError ?? undefined
                  }
                  onSubmit={handleTermsSubmit}
                  extraFields={
                    <FieldGroup>
                      <Field orientation="horizontal">
                        <Checkbox
                          id="acceptMarketingEmails"
                          checked={marketingAccepted}
                          onCheckedChange={(checked) =>
                            setMarketingAccepted(checked === true)
                          }
                        />
                        <FieldContent>
                          <FieldLabel htmlFor="acceptMarketingEmails">
                            {t("terms.acceptMarketing")}
                          </FieldLabel>
                          <FieldDescription>
                            {t("terms.marketingHint")}
                          </FieldDescription>
                          <FieldError />
                        </FieldContent>
                      </Field>
                    </FieldGroup>
                  }
                />
              )}
            </section>
          )}

          {step === "avatar" && currentUser && (
            <section className="space-y-5">
              <div className="flex items-start gap-2 border border-border p-3">
                <ImageIcon className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1 text-xs">
                  <FieldTitle>{t("avatar.title")}</FieldTitle>
                  <FieldDescription>{t("avatar.description")}</FieldDescription>
                </div>
              </div>
              <AvatarUploader
                user={currentUser}
                onUploadingChange={setAvatarUploading}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("createOrg")}
                  disabled={avatarUploading}
                >
                  {t("avatar.skip")}
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep("createOrg")}
                  disabled={avatarUploading}
                >
                  {t("avatar.continue")}
                </Button>
              </div>
            </section>
          )}

          {step === "createOrg" && (
            <section className="space-y-5">
              <div className="flex items-start gap-2 border border-border p-3">
                <Building2Icon className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1 text-xs">
                  <FieldTitle>{t("createOrg.title")}</FieldTitle>
                  <FieldDescription>
                    {t("createOrg.description")}
                  </FieldDescription>
                </div>
              </div>
              {/* Re-use the standalone form. onSuccess captures the new
                  slug for the completion step's redirect; onCancel
                  advances without creating. The form invalidates /my
                  itself, so the rest of the app will see the
                  membership as soon as it mounts. */}
              <CreateOrgForm
                onSuccess={(data) => {
                  createdOrgSlugRef.current = data.slug;
                  setStep("complete");
                }}
                onCancel={() => setStep("complete")}
              />
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("complete")}
              >
                {t("createOrg.skip")}
              </Button>
            </section>
          )}

          {step === "complete" && (
            <section className="space-y-5">
              <div className="flex items-start gap-2 border border-border p-3">
                <ShieldCheckIcon className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1 text-xs">
                  <FieldTitle>{t("complete.title")}</FieldTitle>
                  <FieldDescription>
                    {t("complete.description")}
                  </FieldDescription>
                </div>
              </div>
              {submitError ? (
                <p className="text-xs text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}
              <Button
                className="w-full"
                type="button"
                onClick={() => void finishOnboarding()}
              >
                {t("complete.submit")}
              </Button>
            </section>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Stepper({ activeStep }: { activeStep: Step }) {
  const t = useTranslations("onboarding.page.steps");
  const activeIndex = STEPS.indexOf(activeStep);

  return (
    <ol className="flex flex-wrap gap-2 sm:flex-nowrap">
      {STEPS.map((step, index) => (
        <li
          key={step}
          className={cn(
            "flex flex-1 items-center gap-2 border border-border px-2.5 py-2 text-xs text-muted-foreground",
            index <= activeIndex && "border-foreground text-foreground",
          )}
        >
          <span className="flex size-4 items-center justify-center border border-current">
            {index < activeIndex ? <CheckIcon className="size-3" /> : index + 1}
          </span>
          <span>{t(step)}</span>
        </li>
      ))}
    </ol>
  );
}
