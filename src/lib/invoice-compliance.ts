import type { BusinessProfile, Document, DocumentType, LineItem } from "./types";
import { isEmittedDocument } from "./issuer-snapshot";
import { businessProfileMissingDocumentLabels } from "./business-profile";
import { clientAddressToFormFields } from "./customer-address";

export interface EmissionValidationResult {
  ok: boolean;
  message?: string;
}

export interface InvoiceClientIdentityInput {
  name?: string;
  nif?: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

export function invoiceClientMissingDocumentLabels(
  client: InvoiceClientIdentityInput,
): string[] {
  const labels: string[] = [];

  if (!client.name?.trim()) labels.push("nombre o razón social del cliente");
  if (!client.nif?.trim()) labels.push("NIF/CIF del cliente");
  if (!client.address?.trim()) labels.push("dirección del cliente");
  if (!client.postalCode?.trim()) labels.push("código postal del cliente");
  if (!client.city?.trim()) labels.push("ciudad del cliente");

  return labels;
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

  if (type !== "factura") {
    return { ok: true };
  }

  if (!doc.client.name?.trim()) {
    return { ok: false, message: "Indica el nombre del cliente." };
  }

  if (doc.items.every((item) => !item.description.trim())) {
    return { ok: false, message: "Añade al menos un concepto." };
  }

  const address = clientAddressToFormFields(doc.client);
  const missingClientLabels = invoiceClientMissingDocumentLabels({
    name: doc.client.name,
    nif: doc.client.nif,
    address: address.streetLine,
    postalCode: address.postalCode,
    city: address.city,
  });
  if (missingClientLabels.length > 0) {
    return {
      ok: false,
      message: `Completa estos datos del cliente antes de emitir la factura: ${missingClientLabels.join(", ")}.`,
    };
  }

  const missing = businessProfileMissingDocumentLabels(profile);

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Revisa estos datos antes de emitir una factura: ${missing.join(", ")}. El NIF no se valida con AEAT desde la app.`,
    };
  }

  return { ok: true };
}
