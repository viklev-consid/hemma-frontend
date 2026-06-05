export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProduceCroppedBlobOptions = {
  size?: number;
  mime?: "image/jpeg" | "image/webp";
  maxBytes?: number;
};

const DEFAULT_SIZE = 512;
const DEFAULT_MIME = "image/jpeg";
const DEFAULT_MAX_BYTES = 1_000_000;
const QUALITY_STEPS = [0.92, 0.85, 0.75, 0.65, 0.55];

export async function produceCroppedBlob(
  image: HTMLImageElement,
  area: CropArea,
  options: ProduceCroppedBlobOptions = {},
): Promise<Blob> {
  const size = options.size ?? DEFAULT_SIZE;
  const mime = options.mime ?? DEFAULT_MIME;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size,
    size,
  );

  let lastBlob: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob) {
      continue;
    }
    lastBlob = blob;
    if (blob.size <= maxBytes) {
      return blob;
    }
  }

  if (!lastBlob) {
    throw new Error("Failed to encode cropped image");
  }

  return lastBlob;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}
