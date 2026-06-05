"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Cropper,
  CropperArea,
  CropperImage,
  type CropperAreaData,
} from "@/components/ui/cropper";
import { produceCroppedBlob, type CropArea } from "@/lib/produce-cropped-blob";

type AvatarCropperDialogProps = {
  open: boolean;
  file: File | null;
  uploading: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (blob: Blob) => Promise<void> | void;
};

export default function AvatarCropperDialog({
  open,
  file,
  uploading,
  onOpenChange,
  onSave,
}: AvatarCropperDialogProps) {
  const t = useTranslations("settingsForms.profile.avatar");
  const tCommon = useTranslations("common.actions");
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
    null,
  );
  const [encoding, setEncoding] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const imageUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!imageUrl) {
      return;
    }
    return () => {
      URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const onCropComplete = useCallback(
    (_area: CropperAreaData, areaPixels: CropperAreaData) => {
      setCroppedAreaPixels({
        x: areaPixels.x,
        y: areaPixels.y,
        width: areaPixels.width,
        height: areaPixels.height,
      });
    },
    [],
  );

  async function handleSave() {
    if (!imageRef.current || !croppedAreaPixels) {
      return;
    }
    setEncoding(true);
    try {
      const mime = supportsWebp() ? "image/webp" : "image/jpeg";
      const blob = await produceCroppedBlob(
        imageRef.current,
        croppedAreaPixels,
        { mime },
      );
      await onSave(blob);
    } finally {
      setEncoding(false);
    }
  }

  const isBusy = uploading || encoding;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>{t("cropTitle")}</DialogTitle>
          <DialogDescription>{t("cropDescription")}</DialogDescription>
        </DialogHeader>
        {imageUrl ? (
          <Cropper
            className="relative h-72 w-full overflow-hidden rounded-md bg-muted"
            aspectRatio={1}
            shape="circle"
            objectFit="contain"
            onCropComplete={onCropComplete}
          >
            <CropperImage
              ref={imageRef}
              src={imageUrl}
              alt=""
              crossOrigin="anonymous"
            />
            <CropperArea />
          </Cropper>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!croppedAreaPixels || isBusy}
          >
            {isBusy ? <Spinner /> : null}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

let webpSupportCache: boolean | null = null;
function supportsWebp(): boolean {
  if (webpSupportCache !== null) {
    return webpSupportCache;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupportCache = canvas
    .toDataURL("image/webp")
    .startsWith("data:image/webp");
  return webpSupportCache;
}
