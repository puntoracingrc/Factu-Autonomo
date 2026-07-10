import { MAX_IMAGE_BYTES, MAX_PDF_BYTES } from "./limits";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function resolveScanMimeType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export function validateScanFile(file: File): string | null {
  const mimeType = resolveScanMimeType(file);
  const isPdf = mimeType === "application/pdf";
  const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);

  if (!isPdf && !isImage) {
    return "Formato no soportado. Usa una foto (JPG, PNG, WebP) o un PDF de la factura.";
  }

  const maxBytes = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return isPdf
      ? "El PDF es demasiado grande (máx. 4 MB)."
      : "La imagen es demasiado grande (máx. 4 MB). Si es una foto del móvil, debería optimizarse sola; inténtalo de nuevo.";
  }

  return null;
}
