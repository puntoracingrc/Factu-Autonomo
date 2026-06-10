import { resolveIssuerForDocument } from "./issuer-snapshot";
import type { BusinessProfile, Document } from "./types";

export interface PreparedPdfLogo {
  dataUrl: string;
  width: number;
  height: number;
}

export function resolvePdfLogoUrl(
  doc: Document,
  profile: BusinessProfile,
): string | undefined {
  const issuer = resolveIssuerForDocument(doc, profile);
  const logoUrl = issuer.logoUrl ?? profile.logoUrl;
  if (!logoUrl?.startsWith("data:image/")) return undefined;
  return logoUrl;
}

export function logoMimeFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" | null {
  if (dataUrl.includes("image/png")) return "PNG";
  if (dataUrl.includes("image/webp")) return "WEBP";
  if (
    dataUrl.includes("image/jpeg") ||
    dataUrl.includes("image/jpg") ||
    dataUrl.includes("image/pjpeg")
  ) {
    return "JPEG";
  }
  return null;
}

function fitLogoDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  };
}

export async function prepareLogoForPdf(
  logoUrl: string,
): Promise<PreparedPdfLogo | null> {
  const format = logoMimeFormat(logoUrl);
  if (!format) return null;

  if (typeof window === "undefined") {
    if (format === "PNG" || format === "JPEG") {
      return { dataUrl: logoUrl, width: 120, height: 60 };
    }
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const fitted = fitLogoDimensions(
        img.naturalWidth,
        img.naturalHeight,
        240,
        120,
      );
      const canvas = document.createElement("canvas");
      canvas.width = fitted.width;
      canvas.height = fitted.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, fitted.width, fitted.height);
      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        width: fitted.width,
        height: fitted.height,
      });
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

export function pdfLogoDrawSize(
  logo: PreparedPdfLogo,
  maxWidth = 42,
  maxHeight = 20,
): { width: number; height: number } {
  return fitLogoDimensions(logo.width, logo.height, maxWidth, maxHeight);
}
