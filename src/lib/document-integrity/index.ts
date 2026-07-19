import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import {
  assertDocumentSnapshotsIntegrity,
  buildDocumentPdfSnapshot,
  buildDocumentSnapshotSeal,
  buildDocumentSnapshot,
  projectCanonicalSnapshotOntoDocument,
  withDocumentSnapshotIntegritySignal,
} from "@/lib/document-integrity/snapshots";
import { hasAppIssuedRecoveryProtectionClaim } from "@/lib/document-integrity/app-issued-recovery-protection";
import type {
  BusinessProfile,
  Document,
  DocumentAcceptanceStatus,
  DocumentDeliveryStatus,
  DocumentIntegrityLock,
  DocumentLifecycle,
  DocumentPaymentStatus,
} from "@/lib/types";

export {
  DOCUMENT_PDF_RENDERER_VERSION,
  DOCUMENT_PDF_SNAPSHOT_SCHEMA_VERSION,
  DOCUMENT_SNAPSHOT_SCHEMA_VERSION,
  DocumentSnapshotIntegrityError,
  assertDocumentSnapshotsIntegrity,
  attachRegisteredVerifactuToSnapshots,
  buildDocumentPdfSnapshot,
  buildDocumentSnapshotSeal,
  buildDocumentSnapshot,
  deriveLegacySnapshotForReadOnly,
  documentKindForSnapshot,
  getDocumentSnapshotSource,
  hasDocumentSnapshot,
  hashDocumentPdfSnapshot,
  hashDocumentSnapshot,
  hashStrongDocumentPdfSnapshotContent,
  hashStrongDocumentSnapshotContent,
  inspectDocumentSnapshotsIntegrity,
  projectCanonicalSnapshotOntoDocument,
  stableStringifySnapshot,
  verifyDocumentPdfSnapshotHash,
  verifyDocumentSnapshotHash,
  withDocumentSnapshotIntegritySignal,
} from "@/lib/document-integrity/snapshots";
export type {
  DocumentSnapshotsIntegrityResult,
  DocumentSnapshotIntegrityRequirements,
  SnapshotHashAlgorithm,
  SnapshotHashVerification,
} from "@/lib/document-integrity/snapshots";
export {
  hasLegacyImportOrigin,
  hasLegacyImportProtectionClaim,
  inspectLegacyImportAttestation,
  inspectUsableHistoricalDocumentEvidence,
  isDocumentUsableForFinancialCalculations,
  isUsableLegacyImportedDocument,
  projectLegacyImportSnapshotOntoDocument,
} from "@/lib/document-integrity/legacy-import-attestation";
export { hasAppIssuedRecoveryProtectionClaim } from "@/lib/document-integrity/app-issued-recovery-protection";
export {
  buildAppIssuedDocumentRecoveryPreview,
  buildAppIssuedDocumentRecoveryRollbackPreview,
  inspectAppIssuedDocumentRecovery,
  inspectAppIssuedDocumentRecoveryCollection,
} from "@/lib/document-integrity/app-issued-recovery";

export type DocumentIntegrityErrorCode =
  | "DOCUMENT_ID_MISMATCH"
  | "DOCUMENT_LOCKED"
  | "DOCUMENT_ALREADY_ISSUED"
  | "DOCUMENT_NOT_ISSUED"
  | "DOCUMENT_NUMBER_REQUIRED"
  | "GENERIC_UPDATE_WOULD_LOCK_DOCUMENT"
  | "INVALID_DOCUMENT_TYPE"
  | "DOCUMENT_EMISSION_INVALID"
  | "RECTIFICATION_ORIGINAL_MISSING"
  | "RECTIFICATION_ORIGINAL_INVALID"
  | "RECTIFICATION_DATE_INVALID"
  | "RECTIFICATION_CONFLICT"
  | "RECTIFICATION_RECEIPT_CONFLICT"
  | "DERIVED_DOCUMENT_ISSUER_MISMATCH";

const DEFAULT_MESSAGES: Record<DocumentIntegrityErrorCode, string> = {
  DOCUMENT_ID_MISMATCH: "El documento no coincide con el registro guardado.",
  DOCUMENT_LOCKED:
    "Este documento ya está emitido y no admite edición directa.",
  DOCUMENT_ALREADY_ISSUED: "Este documento ya está emitido.",
  DOCUMENT_NOT_ISSUED: "Primero hay que emitir el documento.",
  DOCUMENT_NUMBER_REQUIRED:
    "El documento necesita un número válido antes de emitirse.",
  GENERIC_UPDATE_WOULD_LOCK_DOCUMENT:
    "La edición genérica no puede emitir ni bloquear documentos.",
  INVALID_DOCUMENT_TYPE:
    "La operación no es válida para este tipo de documento.",
  DOCUMENT_EMISSION_INVALID: "Faltan datos obligatorios antes de emitir.",
  RECTIFICATION_ORIGINAL_MISSING:
    "No se encuentra la factura original de esta rectificativa.",
  RECTIFICATION_ORIGINAL_INVALID:
    "La referencia original no es una factura emitida válida para rectificar.",
  RECTIFICATION_DATE_INVALID:
    "La fecha de la rectificativa no puede ser anterior a la factura original.",
  RECTIFICATION_CONFLICT:
    "La factura original ya tiene otra rectificativa emitida. Revisa la cadena antes de continuar.",
  RECTIFICATION_RECEIPT_CONFLICT:
    "La factura tiene un recibo vinculado y no puede rectificarse sin un flujo explícito de anulación del recibo.",
  DERIVED_DOCUMENT_ISSUER_MISMATCH:
    "El NIF del negocio actual no coincide con el emisor histórico del documento de origen.",
};

export class DocumentIntegrityError extends Error {
  readonly code: DocumentIntegrityErrorCode;

  constructor(
    code: DocumentIntegrityErrorCode,
    message = DEFAULT_MESSAGES[code],
  ) {
    super(message);
    this.name = "DocumentIntegrityError";
    this.code = code;
  }
}

function nowIso(now: Date | string = new Date()): string {
  return typeof now === "string" ? now : now.toISOString();
}

function hasLegacyIssuedStatus(doc: Document): boolean {
  return doc.status !== "borrador";
}

function hasSnapshotIntegrityEvidence(doc: Document): boolean {
  return Boolean(
    doc.documentSnapshot ||
    doc.pdfSnapshot ||
    doc.snapshotSeal ||
    doc.snapshotIntegrityRequired ||
    doc.issuedAt,
  );
}

function isExplicitEditableQuote(doc: Document): boolean {
  return (
    doc.type === "presupuesto" &&
    doc.documentLifecycle === "draft" &&
    doc.integrityLock === "unlocked" &&
    !hasSnapshotIntegrityEvidence(doc)
  );
}

function hasIssuedRectificationEvidence(doc: Document): boolean {
  const number = doc.number.trim().toUpperCase();
  const hasFinalNumber = Boolean(number && number !== "BORRADOR");
  const hasExplicitDraftMarkers =
    doc.documentLifecycle === "draft" && doc.integrityLock === "unlocked";

  return Boolean(
    doc.rectification &&
    (doc.documentSnapshot ||
      doc.pdfSnapshot ||
      doc.snapshotSeal ||
      doc.snapshotIntegrityRequired ||
      doc.verifactu ||
      doc.issuedAt ||
      doc.documentLifecycle === "issued" ||
      doc.integrityLock === "locked" ||
      (hasFinalNumber && !hasExplicitDraftMarkers)),
  );
}

function hasIntegrityRelationship(doc: Document): boolean {
  if (doc.rectifiedById) return true;
  if (!doc.rectification) return false;

  // Una rectificativa puede existir como borrador editable. La relación con la
  // factura original solo se convierte en evidencia de emisión cuando deja de
  // ser borrador o ya contiene señales de sellado documental.
  return doc.status !== "borrador" || hasIssuedRectificationEvidence(doc);
}

export function deriveDocumentLifecycle(doc: Document): DocumentLifecycle {
  if (isExplicitEditableQuote(doc)) return "draft";
  if (doc.documentLifecycle === "canceled" || doc.status === "anulada") {
    return "canceled";
  }

  if (
    doc.documentLifecycle === "issued" ||
    hasSnapshotIntegrityEvidence(doc) ||
    hasLegacyIssuedStatus(doc) ||
    hasIntegrityRelationship(doc)
  ) {
    return "issued";
  }

  return "draft";
}

export function deriveIntegrityLock(doc: Document): DocumentIntegrityLock {
  if (isExplicitEditableQuote(doc)) return "unlocked";
  if (
    doc.integrityLock === "locked" ||
    deriveDocumentLifecycle(doc) !== "draft" ||
    hasLegacyIssuedStatus(doc) ||
    hasIntegrityRelationship(doc)
  ) {
    return "locked";
  }

  return "unlocked";
}

export function isDocumentIntegrityLocked(doc: Document): boolean {
  return deriveIntegrityLock(doc) === "locked";
}

export function assertDocumentEditable(
  current: Document,
  next?: Document,
): void {
  if (
    hasAppIssuedRecoveryProtectionClaim(current) ||
    (next !== undefined && hasAppIssuedRecoveryProtectionClaim(next))
  ) {
    throw new DocumentIntegrityError(
      "DOCUMENT_LOCKED",
      "Un documento con una recuperación registrada está congelado y no admite edición ni emisión.",
    );
  }

  if (next && current.id !== next.id) {
    throw new DocumentIntegrityError("DOCUMENT_ID_MISMATCH");
  }

  if (isDocumentIntegrityLocked(current)) {
    throw new DocumentIntegrityError("DOCUMENT_LOCKED");
  }

  if (next && isDocumentIntegrityLocked(next)) {
    throw new DocumentIntegrityError("GENERIC_UPDATE_WOULD_LOCK_DOCUMENT");
  }
}

function assertIssued(doc: Document): void {
  if (deriveDocumentLifecycle(doc) !== "issued") {
    throw new DocumentIntegrityError("DOCUMENT_NOT_ISSUED");
  }
}

function assertValidDocumentNumber(doc: Document): void {
  const number = doc.number.trim();
  if (!number || number.toUpperCase() === "BORRADOR") {
    throw new DocumentIntegrityError("DOCUMENT_NUMBER_REQUIRED");
  }
}

export function issueDocument(
  doc: Document,
  profile: BusinessProfile,
  issuedAt: Date | string = new Date(),
): Document {
  if (
    deriveDocumentLifecycle(doc) !== "draft" ||
    isDocumentIntegrityLocked(doc)
  ) {
    throw new DocumentIntegrityError("DOCUMENT_ALREADY_ISSUED");
  }

  assertDocumentEditable(doc);
  assertValidDocumentNumber(doc);

  const timestamp = nowIso(issuedAt);
  const issuer = doc.issuer ?? captureIssuerSnapshot(profile, timestamp);
  if (
    doc.documentSnapshot ||
    doc.pdfSnapshot ||
    doc.snapshotSeal ||
    doc.snapshotIntegrityRequired
  ) {
    assertDocumentSnapshotsIntegrity(doc, {
      requireDocumentSnapshot: true,
      requirePdfSnapshot: true,
      requireSnapshotSeal: true,
    });
  }
  const documentSnapshot =
    doc.documentSnapshot ??
    buildDocumentSnapshot(
      {
        ...doc,
        issuer,
      },
      profile,
      {
        capturedAt: timestamp,
        source: "issue",
        issuer,
      },
    );
  const pdfSnapshot =
    doc.pdfSnapshot ??
    buildDocumentPdfSnapshot(documentSnapshot, profile, timestamp);

  assertDocumentSnapshotsIntegrity({ documentSnapshot, pdfSnapshot });

  return projectCanonicalSnapshotOntoDocument(
    withDocumentSnapshotIntegritySignal({
      ...doc,
      issuer,
      documentSnapshot,
      pdfSnapshot,
      snapshotSeal: buildDocumentSnapshotSeal(
        doc.id,
        documentSnapshot,
        pdfSnapshot,
      ),
      snapshotIntegrityRequired: true,
      status: "enviado",
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus: "not_sent",
      issuedAt: doc.issuedAt ?? timestamp,
      updatedAt: timestamp,
    }),
  );
}

export function markDocumentSent(
  doc: Document,
  sentAt: Date | string = new Date(),
): Document {
  if (hasAppIssuedRecoveryProtectionClaim(doc)) {
    throw new DocumentIntegrityError(
      "DOCUMENT_LOCKED",
      "Un documento recuperado está congelado y no admite nuevos cambios de envío.",
    );
  }

  assertIssued(doc);
  assertDocumentSnapshotsIntegrity(doc, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });

  const timestamp = nowIso(sentAt);
  const deliveryStatus: DocumentDeliveryStatus = "sent";

  return {
    ...doc,
    status: doc.status === "borrador" ? "enviado" : doc.status,
    documentLifecycle: "issued",
    integrityLock: "locked",
    deliveryStatus,
    sentAt: doc.sentAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function markDocumentPaid(
  doc: Document,
  paidAt: Date | string = new Date(),
): Document {
  if (hasAppIssuedRecoveryProtectionClaim(doc)) {
    throw new DocumentIntegrityError(
      "DOCUMENT_LOCKED",
      "Un documento recuperado está congelado y no admite nuevos cambios de cobro.",
    );
  }

  assertIssued(doc);
  assertDocumentSnapshotsIntegrity(doc, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });

  const canonicalType = doc.documentSnapshot?.documentType ?? doc.type;
  if (canonicalType !== "factura" && canonicalType !== "recibo") {
    throw new DocumentIntegrityError("INVALID_DOCUMENT_TYPE");
  }

  const timestamp = nowIso(paidAt);
  const paymentStatus: DocumentPaymentStatus = "paid";

  return {
    ...doc,
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    paymentStatus,
    paidAt: doc.paidAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function acceptQuote(
  doc: Document,
  acceptedAt: Date | string = new Date(),
): Document {
  if (hasAppIssuedRecoveryProtectionClaim(doc)) {
    throw new DocumentIntegrityError(
      "DOCUMENT_LOCKED",
      "Un documento con una recuperación registrada está congelado y no admite cambios de aceptación.",
    );
  }

  assertIssued(doc);
  assertDocumentSnapshotsIntegrity(doc, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });

  if (doc.documentSnapshot?.documentType !== "presupuesto") {
    throw new DocumentIntegrityError("INVALID_DOCUMENT_TYPE");
  }

  const timestamp = nowIso(acceptedAt);
  const acceptanceStatus: DocumentAcceptanceStatus = "accepted";

  return {
    ...doc,
    status: "aceptado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    acceptanceStatus,
    acceptedAt: doc.acceptedAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function rejectQuote(
  doc: Document,
  rejectedAt: Date | string = new Date(),
): Document {
  if (hasAppIssuedRecoveryProtectionClaim(doc)) {
    throw new DocumentIntegrityError(
      "DOCUMENT_LOCKED",
      "Un documento con una recuperación registrada está congelado y no admite cambios de aceptación.",
    );
  }

  assertIssued(doc);
  assertDocumentSnapshotsIntegrity(doc, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });

  if (doc.documentSnapshot?.documentType !== "presupuesto") {
    throw new DocumentIntegrityError("INVALID_DOCUMENT_TYPE");
  }

  const timestamp = nowIso(rejectedAt);
  const acceptanceStatus: DocumentAcceptanceStatus = "rejected";

  return {
    ...doc,
    status: "rechazado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    acceptanceStatus,
    acceptedAt: undefined,
    updatedAt: timestamp,
  };
}

export function applyGenericDocumentUpdate(
  current: Document,
  next: Document,
  updatedAt: Date | string = new Date(),
): Document {
  assertDocumentEditable(current, next);
  return {
    ...next,
    documentLifecycle: next.documentLifecycle ?? "draft",
    integrityLock: next.integrityLock ?? "unlocked",
    updatedAt: nowIso(updatedAt),
  };
}
