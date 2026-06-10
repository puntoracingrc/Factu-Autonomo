import type { BusinessProfile, Document, DocumentType, LineItem } from "./types";
import { isEmittedDocument } from "./issuer-snapshot";

export interface EmissionValidationResult {
  ok: boolean;
  message?: string;
}

export function ivaBreakdownByRate(
  items: LineItem[],
): Array<{ rate: number; base: number; quota: number }> {
  const totals = new Map<number, { base: number; quota: number }>();

  for (const item of items) {
    const base = item.quantity * item.unitPrice;
    const quota = base * (item.ivaPercent / 100);
    const current = totals.get(item.ivaPercent) ?? { base: 0, quota: 0 };
    totals.set(item.ivaPercent, {
      base: current.base + base,
      quota: current.quota + quota,
    });
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, values]) => ({ rate, ...values }));
}

export function validateDocumentEmission(
  doc: Pick<Document, "type" | "status" | "client" | "items">,
  profile: BusinessProfile,
  type: DocumentType = doc.type,
): EmissionValidationResult {
  if (!isEmittedDocument(doc as Document)) {
    return { ok: true };
  }

  if (!doc.client.name?.trim()) {
    return { ok: false, message: "Indica el nombre del cliente." };
  }

  if (doc.items.every((item) => !item.description.trim())) {
    return { ok: false, message: "Añade al menos un concepto." };
  }

  if (type !== "factura") {
    return { ok: true };
  }

  const missing: string[] = [];
  if (!profile.name.trim()) missing.push("nombre o razón social");
  if (!profile.nif.trim()) missing.push("NIF");
  if (!profile.address.trim()) missing.push("dirección");
  if (!profile.postalCode.trim()) missing.push("código postal");
  if (!profile.city.trim()) missing.push("ciudad");

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Para emitir facturas, completa en Configuración: ${missing.join(", ")}. Son datos obligatorios según la normativa de facturación.`,
    };
  }

  return { ok: true };
}
