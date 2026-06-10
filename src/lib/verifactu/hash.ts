import { GENESIS_HASH } from "./constants";
import { formatQrAmount, formatQrDate, normalizeIssuerNif } from "./qr";
import type { VerifactuRecordType } from "./types";

export function buildHashPayload(input: {
  issuerNif: string;
  numserie: string;
  fecha: string;
  importe: number;
  recordType: VerifactuRecordType;
  previousHash: string;
}): string {
  const nif = normalizeIssuerNif(input.issuerNif);
  const fecha = formatQrDate(input.fecha);
  const importe = formatQrAmount(input.importe);
  const prev =
    input.previousHash.trim() || GENESIS_HASH;
  return [
    `IDEmisorFactura=${nif}`,
    `NumSerieFactura=${input.numserie}`,
    `FechaExpedicionFactura=${fecha}`,
    `ImporteTotal=${importe}`,
    `TipoRegistro=${input.recordType === "alta" ? "A" : "N"}`,
    `HuellaRegistroAnterior=${prev}`,
  ].join("&");
}

export async function sha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle?.digest) {
    throw new Error("Web Crypto no disponible para calcular huella Veri*Factu");
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeRecordHash(input: {
  issuerNif: string;
  numserie: string;
  fecha: string;
  importe: number;
  recordType: VerifactuRecordType;
  previousHash: string;
}): Promise<string> {
  const payload = buildHashPayload(input);
  return sha256Hex(payload);
}
