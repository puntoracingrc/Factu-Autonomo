import { AEAT_HOSTS, AEAT_QR_PATH } from "./constants";
import type { VerifactuEnvironment } from "./types";

/** Fecha AEAT para QR: DD-MM-AAAA */
export function formatQrDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("T")[0].split("-");
  if (!year || !month || !day) {
    throw new Error(`Fecha inválida para QR Verifactu: ${isoDate}`);
  }
  return `${day}-${month}-${year}`;
}

/** Importe con punto decimal, máx. 12 enteros + 2 decimales */
export function formatQrAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error("Importe inválido para QR Verifactu");
  }
  const rounded = Math.round(amount * 100) / 100;
  const [intPart, decPart = "00"] = rounded.toFixed(2).split(".");
  if (intPart.replace("-", "").length > 12) {
    throw new Error("Importe demasiado grande para QR Verifactu");
  }
  return `${intPart}.${decPart}`;
}

export function normalizeIssuerNif(nif: string): string {
  const cleaned = nif.trim().toUpperCase().replace(/\s/g, "");
  if (cleaned.length !== 9) {
    throw new Error("El NIF del emisor debe tener 9 caracteres para Verifactu");
  }
  return cleaned;
}

export function buildQrUrl(params: {
  nif: string;
  numserie: string;
  fecha: string;
  importe: number;
  environment: VerifactuEnvironment;
}): string {
  const host = AEAT_HOSTS[params.environment];
  const query = new URLSearchParams({
    nif: normalizeIssuerNif(params.nif),
    numserie: params.numserie,
    fecha: formatQrDate(params.fecha),
    importe: formatQrAmount(params.importe),
  });
  return `${host}${AEAT_QR_PATH}?${query.toString()}`;
}

export function buildQrValidationUrlWithJson(qrUrl: string): string {
  const url = new URL(qrUrl);
  url.searchParams.set("formato", "json");
  return url.toString();
}
