/**
 * Huella SHA-256 según AEAT spec v0.1.2 (27/08/2024).
 * @see https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf
 */
import type { VerifactuRecordType } from "./types";

export interface RegistroAltaHashInput {
  idEmisorFactura: string;
  numSerieFactura: string;
  fechaExpedicionFactura: string;
  tipoFactura: string;
  cuotaTotal: string;
  importeTotal: string;
  huellaAnterior: string | null;
  fechaHoraHusoGenRegistro: string;
}

export interface RegistroAnulacionHashInput {
  idEmisorFacturaAnulada: string;
  numSerieFacturaAnulada: string;
  fechaExpedicionFacturaAnulada: string;
  huellaAnterior: string | null;
  fechaHoraHusoGenRegistro: string;
}

function trimFieldValue(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function concatenateHashFields(
  fields: Array<[string, string | null | undefined]>,
): string {
  return fields
    .map(([name, value]) => `${name}=${trimFieldValue(value)}`)
    .join("&");
}

export function buildRegistroAltaPayload(input: RegistroAltaHashInput): string {
  return concatenateHashFields([
    ["IDEmisorFactura", input.idEmisorFactura],
    ["NumSerieFactura", input.numSerieFactura],
    ["FechaExpedicionFactura", input.fechaExpedicionFactura],
    ["TipoFactura", input.tipoFactura],
    ["CuotaTotal", input.cuotaTotal],
    ["ImporteTotal", input.importeTotal],
    ["Huella", input.huellaAnterior],
    ["FechaHoraHusoGenRegistro", input.fechaHoraHusoGenRegistro],
  ]);
}

export function buildRegistroAnulacionPayload(
  input: RegistroAnulacionHashInput,
): string {
  return concatenateHashFields([
    ["IDEmisorFacturaAnulada", input.idEmisorFacturaAnulada],
    ["NumSerieFacturaAnulada", input.numSerieFacturaAnulada],
    ["FechaExpedicionFacturaAnulada", input.fechaExpedicionFacturaAnulada],
    ["Huella", input.huellaAnterior],
    ["FechaHoraHusoGenRegistro", input.fechaHoraHusoGenRegistro],
  ]);
}

export async function sha256HexUpper(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle?.digest) {
    throw new Error("Web Crypto no disponible para calcular huella Veri*Factu");
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function computeRegistroAltaHash(
  input: RegistroAltaHashInput,
): Promise<string> {
  return sha256HexUpper(buildRegistroAltaPayload(input));
}

export async function computeRegistroAnulacionHash(
  input: RegistroAnulacionHashInput,
): Promise<string> {
  return sha256HexUpper(buildRegistroAnulacionPayload(input));
}

export function normalizeHuellaAnterior(
  previousHash: string | null | undefined,
): string | null {
  const trimmed = previousHash?.trim() ?? "";
  if (!trimmed) return null;
  if (!/^[a-f\d]{64}$/i.test(trimmed)) {
    throw new Error("La huella anterior no es un SHA-256 hexadecimal válido");
  }
  return trimmed.toUpperCase();
}

export async function computeRecordHash(input: {
  recordType: VerifactuRecordType;
  alta?: RegistroAltaHashInput;
  anulacion?: RegistroAnulacionHashInput;
}): Promise<string> {
  if (input.recordType === "anulacion") {
    if (!input.anulacion) {
      throw new Error("Faltan datos de registro de anulación para la huella");
    }
    return computeRegistroAnulacionHash(input.anulacion);
  }
  if (!input.alta) {
    throw new Error("Faltan datos de registro de alta para la huella");
  }
  return computeRegistroAltaHash(input.alta);
}
