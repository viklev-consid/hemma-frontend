"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { problemFromResponse, type ProblemDetails } from "@/api/problems";
import { fetchJson } from "@/components/settings/client-fetch";
import { UserAvatar } from "@/components/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload";

const AvatarCropperDialog = dynamic(
  () => import("@/components/avatar-cropper-dialog"),
  { ssr: false },
);

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";
const MAX_SOURCE_BYTES = 25_000_000;

type AvatarUploaderProps = {
  user: {
    displayName?: string | null;
    avatar?: { url: string } | null;
  };
  onUploadingChange?: (uploading: boolean) => void;
};

export function AvatarUploader({
  user,
  onUploadingChange,
}: AvatarUploaderProps) {
  const t = useTranslations("settingsForms.profile.avatar");
  const tCommon = useTranslations("common.actions");
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  function setUploadingFlag(value: boolean) {
    setUploading(value);
    onUploadingChange?.(value);
  }

  function onFileReject(file: File, message: string) {
    if (message.toLowerCase().includes("size")) {
      toast.error(t("errors.tooLarge"));
    } else {
      toast.error(t("errors.unsupportedFormat"));
    }
  }

  function onAccept(files: File[]) {
    const next = files[0];
    if (next) {
      setSelectedFile(next);
    }
  }

  async function uploadBlob(blob: Blob) {
    setUploadingFlag(true);
    try {
      const extension = blob.type === "image/webp" ? "webp" : "jpg";
      const formData = new FormData();
      formData.append(
        "avatar",
        new File([blob], `avatar.${extension}`, { type: blob.type }),
      );

      const response = await fetch("/api/proxy/v1/users/me/avatar", {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const problem = await problemFromResponse(response);
        throw problem;
      }

      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success(t("uploaded"));
      setSelectedFile(null);
    } catch (error) {
      const problem = error as ProblemDetails;
      toast.error(problem.detail ?? problem.title ?? t("errors.uploadFailed"));
    } finally {
      setUploadingFlag(false);
    }
  }

  async function removeAvatar() {
    setRemoving(true);
    try {
      await fetchJson<undefined>("/api/proxy/v1/users/me/avatar", {
        method: "DELETE",
      });
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success(t("removed"));
      setRemoveOpen(false);
    } catch (error) {
      const problem = error as ProblemDetails;
      toast.error(problem.detail ?? problem.title ?? t("errors.removeFailed"));
    } finally {
      setRemoving(false);
    }
  }

  const hasAvatar = Boolean(user.avatar?.url);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <UserAvatar user={user} size="lg" className="size-16" />
      <FileUpload
        accept={ACCEPTED_TYPES}
        maxFiles={1}
        maxSize={MAX_SOURCE_BYTES}
        onAccept={onAccept}
        onFileReject={onFileReject}
        className="flex flex-wrap items-center gap-2"
      >
        <FileUploadTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <UploadIcon className="size-4" />
            {t("change")}
          </Button>
        </FileUploadTrigger>
        {hasAvatar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRemoveOpen(true)}
          >
            <Trash2Icon className="size-4" />
            {t("remove")}
          </Button>
        ) : null}
        <p className="basis-full text-xs text-muted-foreground sm:basis-auto">
          {t("dropzoneHint")}
        </p>
      </FileUpload>

      <AvatarCropperDialog
        open={selectedFile !== null}
        file={selectedFile}
        uploading={uploading}
        onOpenChange={(open) => {
          if (!open && !uploading) {
            setSelectedFile(null);
          }
        }}
        onSave={uploadBlob}
      />

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void removeAvatar();
              }}
              disabled={removing}
            >
              {removing ? tCommon("loading") : t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
