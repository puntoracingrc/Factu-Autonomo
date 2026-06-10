import QRCode from "qrcode";
import type { Document } from "../types";

export async function generateQrDataUrl(
  qrUrl: string,
  sizePx = 120,
): Promise<string> {
  return QRCode.toDataURL(qrUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: sizePx,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

export function hasVerifactuQr(doc: Document): boolean {
  return Boolean(doc.verifactu?.qrUrl);
}

export async function prepareVerifactuQrForPdf(
  doc: Document,
): Promise<string | undefined> {
  if (!doc.verifactu?.qrUrl) return undefined;
  return generateQrDataUrl(doc.verifactu.qrUrl);
}
