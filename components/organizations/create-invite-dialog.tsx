"use client";

import "@/api/client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import {
  createOrganizationInvitationMutation,
  listOrganizationInvitationsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { CreateOrganizationInvitationResponse } from "@/api/generated";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import { RawTokenPanel } from "@/components/organizations/raw-token-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg } from "@/lib/org-context";
import { formatRoleLabel, rolesBelow, type OrgRole } from "@/lib/org-roles";

/**
 * Create-invitation dialog.
 *
 * Two phases:
 * 1. Compose: email + role (role options trimmed to `rolesBelow(callerRole)`).
 * 2. Result:  the one-time `<RawTokenPanel>` showing the rawToken + a
 *    prebuilt invite URL. Backend never returns the token again; the
 *    inviter must capture it from this panel.
 */
export function CreateInviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <CreateInviteContent onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateInviteContent({ onClose }: { onClose: () => void }) {
  const t = useTranslations("organizations.invitations.create");
  const tCommon = useTranslations("common.actions");
  const org = useOrg();
  const queryClient = useQueryClient();

  const callerRole = org.role ?? "";
  const candidateRoles: OrgRole[] = callerRole ? rolesBelow(callerRole) : [];

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(candidateRoles[0] ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] =
    useState<CreateOrganizationInvitationResponse | null>(null);

  const mutation = useMutation({
    ...createOrganizationInvitationMutation(),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: listOrganizationInvitationsQueryKey({
          path: { organizationRef: org.slug },
        }),
      });
      setResult(data);
    },
    onError: (error) => {
      const problem = error as unknown as ProblemDetails;
      const errors = mapProblemToFieldErrors(problem);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      handleProblem(problem);
    },
  });

  if (result) {
    // Mirror the URL pattern the backend embeds in its own invitation
    // emails so the manual copy-and-share path produces an identical
    // experience to the auto-sent link.
    // This panel only renders inside an open Dialog, which only mounts
    // client-side — no SSR guard needed for `window`.
    const path = `/invite?token=${encodeURIComponent(
      result.rawToken,
    )}&email=${encodeURIComponent(result.email)}`;
    const inviteUrl = `${window.location.origin}${path}`;

    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("successTitle")}</DialogTitle>
          <DialogDescription>
            {t("successDescription", { email: result.email })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <RawTokenPanel rawToken={result.rawToken} inviteUrl={inviteUrl} />
        </div>
        <DialogFooter>
          <DialogClose
            render={<Button type="button">{tCommon("done")}</Button>}
            onClick={onClose}
          />
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          setFieldErrors({});
          const trimmed = email.trim();
          if (!trimmed) {
            setFieldErrors({ email: t("emailRequired") });
            return;
          }
          if (!role) {
            setFieldErrors({ role: t("roleRequired") });
            return;
          }
          mutation.mutate({
            path: { organizationRef: org.slug },
            body: { email: trimmed, role },
          });
        }}
      >
        <FieldGroup>
          <Field data-invalid={Boolean(fieldErrors.email)}>
            <FieldLabel htmlFor="invite-email">{t("emailLabel")}</FieldLabel>
            <FieldContent>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </FieldContent>
          </Field>
          <Field data-invalid={Boolean(fieldErrors.role)}>
            <FieldLabel htmlFor="invite-role">{t("roleLabel")}</FieldLabel>
            <FieldContent>
              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder={t("rolePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {candidateRoles.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatRoleLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{fieldErrors.role}</FieldError>
            </FieldContent>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || candidateRoles.length === 0}
          >
            {mutation.isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
