import { canPhysicallyDeleteDocument } from "@/lib/document-integrity/deletion";
import type { Document } from "@/lib/types";

function normalizedText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizedNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(8))
    : null;
}

/**
 * Contenido documental que una reimportación nunca puede reescribir una vez
 * emitido. Se omiten IDs técnicos, timestamps y estados operativos (pago,
 * entrega, aceptación), que pueden variar sin cambiar el justificante fiscal.
 */
function protectedImportFingerprint(document: Document): string {
  const snapshot = document.documentSnapshot;
  const customer = snapshot?.customer ?? document.client;
  const issuer = snapshot?.issuer ?? document.issuer;
  const items = snapshot?.items ?? document.items;
  const rectification = snapshot?.rectification ?? document.rectification;

  return JSON.stringify({
    type: snapshot?.documentType ?? document.type,
    number: normalizedText(snapshot?.number ?? document.number),
    date: snapshot?.date ?? document.date,
    dueDate: normalizedText(snapshot?.dueDate ?? document.dueDate),
    customer: {
      customerType: customer.customerType ?? null,
      residenceType: customer.residenceType ?? null,
      firstName: normalizedText(customer.firstName),
      lastName: normalizedText(customer.lastName),
      name: normalizedText(customer.name),
      contactName: normalizedText(customer.contactName),
      nif: normalizedText(customer.nif)?.toUpperCase() ?? null,
      email: normalizedText(customer.email)?.toLowerCase() ?? null,
      phone: normalizedText(customer.phone),
      streetType: normalizedText(customer.streetType),
      address: normalizedText(customer.address),
      addressExtra: normalizedText(customer.addressExtra),
      city: normalizedText(customer.city),
      postalCode: normalizedText(customer.postalCode),
    },
    issuer: issuer
      ? {
          name: normalizedText(issuer.name),
          commercialName: normalizedText(issuer.commercialName),
          nif: normalizedText(issuer.nif)?.toUpperCase() ?? null,
          vatId: normalizedText(issuer.vatId)?.toUpperCase() ?? null,
          address: normalizedText(issuer.address),
          city: normalizedText(issuer.city),
          postalCode: normalizedText(issuer.postalCode),
          province: normalizedText(issuer.province),
          country: normalizedText(issuer.country),
          phone: normalizedText(issuer.phone),
          email: normalizedText(issuer.email)?.toLowerCase() ?? null,
          website: normalizedText(issuer.website)?.toLowerCase() ?? null,
          iban: normalizedText(issuer.iban)?.replace(/\s+/g, "").toUpperCase() ?? null,
          logoUrl: normalizedText(issuer.logoUrl),
        }
      : null,
    items: items.map((item) => ({
      description: normalizedText(item.description),
      quantity: normalizedNumber(item.quantity),
      unit: normalizedText(item.unit),
      unitPrice: normalizedNumber(item.unitPrice),
      ivaPercent: normalizedNumber(item.ivaPercent),
    })),
    notes: normalizedText(snapshot?.notes ?? document.notes),
    paymentTerms: normalizedText(
      snapshot?.paymentTerms ?? document.paymentTerms,
    ),
    rectification: rectification
      ? {
          originalNumber: normalizedText(rectification.originalNumber),
          originalDate: rectification.originalDate,
          reason: normalizedText(rectification.reason),
          type: rectification.type,
        }
      : null,
    annulled: document.status === "anulada",
  });
}

function hasEquivalentProtectedContent(
  current: Document,
  imported: Document,
): boolean {
  return (
    protectedImportFingerprint(current) ===
    protectedImportFingerprint(imported)
  );
}

export function mergeImportedDocumentsPreservingProtected(input: {
  current: Document[];
  imported: Document[];
  belongsToSource: (document: Document) => boolean;
}): {
  documents: Document[];
  acceptedImported: Document[];
  preservedDocumentIds: string[];
  conflictingDocumentIds: string[];
} {
  const protectedSourceDocuments = new Map(
    input.current
      .filter(
        (document) =>
          input.belongsToSource(document) &&
          !canPhysicallyDeleteDocument(document),
      )
      .map((document) => [document.id, document] as const),
  );
  const protectedSourceIds = new Set(protectedSourceDocuments.keys());
  const kept = input.current.filter(
    (document) =>
      !input.belongsToSource(document) || protectedSourceIds.has(document.id),
  );
  const acceptedImported = input.imported.filter(
    (document) => !protectedSourceIds.has(document.id),
  );
  const conflictingDocumentIds = input.imported.flatMap((document) => {
    const current = protectedSourceDocuments.get(document.id);
    return current && !hasEquivalentProtectedContent(current, document)
      ? [document.id]
      : [];
  });

  return {
    documents: [...kept, ...acceptedImported],
    acceptedImported,
    preservedDocumentIds: [...protectedSourceIds],
    conflictingDocumentIds,
  };
}

export function assertNoProtectedImportReplacements(result: {
  conflictingDocumentIds: string[];
}): void {
  if (result.conflictingDocumentIds.length === 0) return;
  throw new Error(
    `La reimportación intentaría sustituir ${result.conflictingDocumentIds.length} documento(s) emitido(s) o protegido(s) con contenido diferente. No se aplicó ningún cambio; conserva esos documentos y revisa el lote por separado.`,
  );
}
