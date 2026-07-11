import QRCode from "qrcode";
import type { Document } from "../types";
import { hasPublicVerifactuAccreditation } from "./attestation";

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
  return hasPublicVerifactuAccreditation(doc);
}

export async function prepareVerifactuQrForPdf(
  doc: Document,
): Promise<string | undefined> {
  if (!hasVerifactuQr(doc)) return undefined;
  return generateQrDataUrl(doc.verifactu!.qrUrl);
}
