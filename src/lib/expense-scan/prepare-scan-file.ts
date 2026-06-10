import {
  COMPRESS_IMAGE_ABOVE_BYTES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  TARGET_IMAGE_BYTES,
} from "./limits";
import { resolveScanMimeType } from "./openai";

const COMPRESSIBLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function scaleDimensions(width: number, height: number, maxDim: number) {
  const longest = Math.max(width, height);
  if (longest <= maxDim) {
    return { width, height };
  }
  const scale = maxDim / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo comprimir la imagen."));
      },
      "image/jpeg",
      quality,
    );
  });
}

async function renderJpeg(
  img: HTMLImageElement,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  const { width, height } = scaleDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxDim,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Tu navegador no puede optimizar la imagen.");
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToJpegBlob(canvas, quality);
}

async function compressImage(file: File): Promise<File> {
  const img = await loadImage(file);
  let maxDim = MAX_IMAGE_DIMENSION;
  let quality = 0.88;
  let bestBlob: Blob | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const blob = await renderJpeg(img, maxDim, quality);
    bestBlob = blob;

    if (blob.size <= TARGET_IMAGE_BYTES) {
      break;
    }

    if (quality > 0.55) {
      quality -= 0.08;
    } else {
      maxDim = Math.round(maxDim * 0.82);
      quality = 0.84;
    }
  }

  if (!bestBlob) {
    throw new Error("No se pudo optimizar la imagen.");
  }

  if (bestBlob.size > MAX_IMAGE_BYTES) {
    throw new Error(
      "La imagen sigue siendo demasiado grande tras optimizarla. Prueba otra foto más cercana o un PDF.",
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "factura";
  return new File([bestBlob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function shouldCompressScanImage(file: File): boolean {
  const mime = resolveScanMimeType(file);
  return (
    COMPRESSIBLE_IMAGE_TYPES.has(mime) &&
    file.size > COMPRESS_IMAGE_ABOVE_BYTES
  );
}

export async function prepareScanFile(
  file: File,
): Promise<{ file: File; wasCompressed: boolean }> {
  const mime = resolveScanMimeType(file);
  if (mime === "application/pdf" || !COMPRESSIBLE_IMAGE_TYPES.has(mime)) {
    return { file, wasCompressed: false };
  }

  if (!shouldCompressScanImage(file) && file.size <= MAX_IMAGE_BYTES) {
    return { file, wasCompressed: false };
  }

  const compressed = await compressImage(file);
  return { file: compressed, wasCompressed: true };
}
