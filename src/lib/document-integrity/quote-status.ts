import {
  DocumentIntegrityError,
  assertDocumentSnapshotsIntegrity,
  projectCanonicalSnapshotOntoDocument,
} from "@/lib/document-integrity";
import type { Document } from "@/lib/types";

function hasSnapshotEvidence(document: Document): boolean {
  return Boolean(
    document.documentSnapshot ||
      document.pdfSnapshot ||
      document.snapshotSeal ||
      document.snapshotIntegrityRequired ||
      document.snapshotIntegrity ||
      document.issuedAt,
  );
}

/**
 * Aplica estados operativos a presupuestos editables. Si el presupuesto ya
 * está sellado, valida y conserva toda su evidencia en vez de convertirlo de
 * nuevo en un borrador sin trazabilidad.
 */
export function editableQuoteWithLocalStatus(
  next: Document,
  updatedAt: string,
): Document {
  const accepted = next.status === "aceptado" || next.status === "pagado";
  const rejected = next.status === "rechazado";
  const deliveryStatus =
    next.status === "borrador"
      ? "not_sent"
      : (next.deliveryStatus ?? "not_sent");

  if (hasSnapshotEvidence(next)) {
    assertDocumentSnapshotsIntegrity(next, {
      requireDocumentSnapshot: true,
      requirePdfSnapshot: true,
      requireSnapshotSeal: true,
    });
    if (next.documentSnapshot?.documentType !== "presupuesto") {
      throw new DocumentIntegrityError("INVALID_DOCUMENT_TYPE");
    }

    const canonical = projectCanonicalSnapshotOntoDocument(next);
    return {
      ...canonical,
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus,
      paymentStatus: "not_applicable",
      acceptanceStatus: accepted
        ? "accepted"
        : rejected
          ? "rejected"
          : next.status === "borrador"
            ? undefined
            : "pending",
      sentAt:
        deliveryStatus === "sent" ? (next.sentAt ?? updatedAt) : undefined,
      paidAt: undefined,
      acceptedAt: accepted ? (next.acceptedAt ?? updatedAt) : undefined,
      updatedAt,
    };
  }

  return {
    ...next,
    issuer: undefined,
    verifactu: undefined,
    documentSnapshot: undefined,
    pdfSnapshot: undefined,
    snapshotSeal: undefined,
    snapshotIntegrityRequired: undefined,
    snapshotIntegrity: undefined,
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    deliveryStatus,
    paymentStatus: "not_applicable",
    acceptanceStatus: accepted
      ? "accepted"
      : rejected
        ? "rejected"
        : next.status === "borrador"
          ? undefined
          : "pending",
    issuedAt: undefined,
    sentAt: deliveryStatus === "sent" ? (next.sentAt ?? updatedAt) : undefined,
    paidAt: undefined,
    acceptedAt: accepted ? (next.acceptedAt ?? updatedAt) : undefined,
    updatedAt,
  };
}
