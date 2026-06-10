import { resolveIssuerNif } from "../issuer-snapshot";
import type { BusinessProfile, Document } from "../types";
import { documentAmounts, isVatExempt } from "../vat-regime";
import {
  computeRecordHash,
  normalizeHuellaAnterior,
  type RegistroAltaHashInput,
  type RegistroAnulacionHashInput,
} from "./hash";
import { formatQrAmount, formatQrDate, normalizeIssuerNif } from "./qr";
import { resolveTipoFactura } from "./tipo-factura";
import { formatAeatRecordTimestamp } from "./timestamp";
import type { VerifactuRecordType } from "./types";

export function buildAltaHashInput(input: {
  doc: Document;
  profile: BusinessProfile;
  previousHash: string | null;
  recordTimestamp?: string;
}): RegistroAltaHashInput {
  const vatExempt = isVatExempt(input.profile);
  const { total, iva } = documentAmounts(input.doc, vatExempt);

  return {
    idEmisorFactura: normalizeIssuerNif(
      resolveIssuerNif(input.doc, input.profile),
    ),
    numSerieFactura: input.doc.number.trim(),
    fechaExpedicionFactura: formatQrDate(input.doc.date),
    tipoFactura: resolveTipoFactura(input.doc),
    cuotaTotal: formatQrAmount(iva),
    importeTotal: formatQrAmount(total),
    huellaAnterior: normalizeHuellaAnterior(input.previousHash),
    fechaHoraHusoGenRegistro:
      input.recordTimestamp ?? formatAeatRecordTimestamp(),
  };
}

export function buildAnulacionHashInput(input: {
  doc: Document;
  profile: BusinessProfile;
  previousHash: string | null;
  recordTimestamp?: string;
}): RegistroAnulacionHashInput {
  const original = input.doc.rectification;
  if (!original) {
    throw new Error("La anulación Veri*Factu requiere datos de factura original");
  }

  return {
    idEmisorFacturaAnulada: normalizeIssuerNif(
      resolveIssuerNif(input.doc, input.profile),
    ),
    numSerieFacturaAnulada: original.originalNumber.trim(),
    fechaExpedicionFacturaAnulada: formatQrDate(original.originalDate),
    huellaAnterior: normalizeHuellaAnterior(input.previousHash),
    fechaHoraHusoGenRegistro:
      input.recordTimestamp ?? formatAeatRecordTimestamp(),
  };
}

export async function computeDocumentRecordHash(input: {
  doc: Document;
  profile: BusinessProfile;
  recordType: VerifactuRecordType;
  previousHash: string | null;
  recordTimestamp?: string;
}): Promise<string> {
  if (input.recordType === "anulacion") {
    return computeRecordHash({
      recordType: "anulacion",
      anulacion: buildAnulacionHashInput(input),
    });
  }

  return computeRecordHash({
    recordType: "alta",
    alta: buildAltaHashInput(input),
  });
}

/** Registro de anulación AEAT: revocar un registro ya remitido (distinto de rectificativa R1). */
export function documentRecordType(doc: Document): VerifactuRecordType {
  if (doc.verifactu?.recordType === "anulacion") return "anulacion";
  return "alta";
}
