"use client";

export const MAX_BUSINESS_LOGO_INPUT_BYTES = 2 * 1024 * 1024;
export const MAX_BUSINESS_LOGO_DATA_URL_BYTES = 160 * 1024;
export const MAX_BUSINESS_LOGO_DIMENSION = 1_200;

const MIN_BUSINESS_LOGO_DIMENSION = 320;
const SUPPORTED_BUSINESS_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class BusinessLogoPreparationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessLogoPreparationError";
  }
}

export function validateBusinessLogoFile(
  file: Pick<File, "size" | "type">,
): string | null {
  if (!SUPPORTED_BUSINESS_LOGO_TYPES.has(file.type.toLowerCase())) {
    return "El formato de este logo no es compatible. Usa un archivo PNG, JPG o WebP.";
  }
  if (file.size > MAX_BUSINESS_LOGO_INPUT_BYTES) {
    return "El logo supera el máximo de 2 MB. Elige una imagen más ligera.";
  }
  if (file.size <= 0) {
    return "El archivo del logo está vacío. Elige otra imagen.";
  }
  return null;
}

export function fitBusinessLogoDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function businessLogoDataUrlBytes(dataUrl: string): number {
  return new TextEncoder().encode(dataUrl).byteLength;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new BusinessLogoPreparationError("No se pudo leer el logo."));
    };
    reader.onerror = () =>
      reject(new BusinessLogoPreparationError("No se pudo leer el logo."));
    reader.readAsDataURL(blob);
  });
}

function loadBusinessLogo(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new BusinessLogoPreparationError(
          "No se pudo abrir la imagen. Comprueba que sea un PNG, JPG o WebP válido.",
        ),
      );
    };
    image.src = objectUrl;
  });
}

function canvasToWebp(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else {
          reject(
            new BusinessLogoPreparationError(
              "Este navegador no pudo optimizar el logo. Prueba con otra imagen PNG, JPG o WebP.",
            ),
          );
        }
      },
      "image/webp",
      quality,
    );
  });
}

async function renderBusinessLogo(
  image: HTMLImageElement,
  maxDimension: number,
  quality: number,
): Promise<string> {
  const dimensions = fitBusinessLogoDimensions(
    image.naturalWidth,
    image.naturalHeight,
    maxDimension,
  );
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new BusinessLogoPreparationError(
      "Este navegador no puede preparar el logo. Prueba con otro navegador o con otra imagen.",
    );
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  return readBlobAsDataUrl(await canvasToWebp(canvas, quality));
}

export async function prepareBusinessLogo(file: File): Promise<string> {
  const validationError = validateBusinessLogoFile(file);
  if (validationError) throw new BusinessLogoPreparationError(validationError);

  const image = await loadBusinessLogo(file);
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new BusinessLogoPreparationError(
      "La imagen no tiene unas dimensiones válidas. Elige otro logo.",
    );
  }

  const originalDataUrl = await readBlobAsDataUrl(file);
  if (
    businessLogoDataUrlBytes(originalDataUrl) <=
    MAX_BUSINESS_LOGO_DATA_URL_BYTES
  ) {
    return originalDataUrl;
  }

  let maxDimension = MAX_BUSINESS_LOGO_DIMENSION;
  let quality = 0.92;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const optimized = await renderBusinessLogo(image, maxDimension, quality);
    if (
      businessLogoDataUrlBytes(optimized) <=
      MAX_BUSINESS_LOGO_DATA_URL_BYTES
    ) {
      return optimized;
    }

    if (quality > 0.6) {
      quality = Math.max(0.6, quality - 0.08);
    } else {
      maxDimension = Math.max(
        MIN_BUSINESS_LOGO_DIMENSION,
        Math.round(maxDimension * 0.8),
      );
      quality = 0.88;
    }
  }

  throw new BusinessLogoPreparationError(
    "El logo es válido, pero no se pudo reducir lo suficiente para guardarlo de forma segura. Prueba con una imagen más sencilla o de menor resolución.",
  );
}
