import type { AppData, Document } from "@/lib/types";
import { DRAFT_INVOICE_NUMBER } from "@/lib/documents";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";

const FORBIDDEN = [
  "centralInvoiceAuthority",
  "centralBusinessReceiptAuthority",
  "issuer",
  "documentSnapshot",
  "pdfSnapshot",
  "snapshotSeal",
  "issuedAt",
  "verifactu",
  "verifactuPersistence",
  "legacyImportAttestation",
  "legacyImportProvenance",
  "appIssuedRecoveryAttestation",
  "receiptDocumentId",
  "sourceDocumentId",
  "paidAt",
  "sentAt",
  "acceptedAt",
  "rectifiedById",
  "snapshotIntegrityRequired",
  "snapshotIntegrity",
  "integrityQuarantine",
  "collectionStatusOverride",
] as const;

export function isSharedDocumentDraft(doc: Document): boolean {
  return (
    (doc.type === "factura" || doc.type === "recibo") &&
    doc.status === "borrador" &&
    (!doc.documentLifecycle || doc.documentLifecycle === "draft") &&
    (!doc.integrityLock || doc.integrityLock === "unlocked") &&
    (!doc.deliveryStatus || doc.deliveryStatus === "not_sent") &&
    (!doc.paymentStatus || doc.paymentStatus === "not_applicable") &&
    FORBIDDEN.every((key) => doc[key] === undefined)
  );
}

export function sharedDraftServerPayload(doc: Document): Document {
  const payload = { ...doc };
  delete payload.centralBusinessDraftVersion;
  return payload;
}

export function saveSharedDocumentDraft(
  data: AppData,
  requested: Document,
  expected: Document | undefined,
  now: string,
) {
  const current = data.documents.find((doc) => doc.id === requested.id);
  if (stableStringifySnapshot(current) !== stableStringifySnapshot(expected))
    throw new Error(
      "El borrador cambió en otro dispositivo. Reabre su versión actual antes de guardar.",
    );
  if (
    (current && !isSharedDocumentDraft(current)) ||
    !isSharedDocumentDraft(requested) ||
    (current && current.type !== requested.type)
  )
    throw new Error(
      "Solo se pueden compartir borradores sin emisión ni evidencia fiscal.",
    );
  const value: Document = {
    ...requested,
    number: DRAFT_INVOICE_NUMBER,
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
  return {
    data: {
      ...data,
      documents: current
        ? data.documents.map((doc) => (doc.id === value.id ? value : doc))
        : [...data.documents, value],
    },
    value,
  };
}

export function deleteSharedDocumentDraft(data: AppData, id: string) {
  const current = data.documents.find((doc) => doc.id === id);
  if (!current || !isSharedDocumentDraft(current))
    throw new Error("Este documento ya no es un borrador editable.");
  return {
    data: { ...data, documents: data.documents.filter((doc) => doc.id !== id) },
    value: true,
  };
}
