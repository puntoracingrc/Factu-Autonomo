import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import type {
  BusinessProfile,
  Document,
  DocumentAcceptanceStatus,
  DocumentDeliveryStatus,
  DocumentIntegrityLock,
  DocumentLifecycle,
  DocumentPaymentStatus,
} from "@/lib/types";

export type DocumentIntegrityErrorCode =
  | "DOCUMENT_ID_MISMATCH"
  | "DOCUMENT_LOCKED"
  | "DOCUMENT_ALREADY_ISSUED"
  | "DOCUMENT_NOT_ISSUED"
  | "DOCUMENT_NUMBER_REQUIRED"
  | "GENERIC_UPDATE_WOULD_LOCK_DOCUMENT"
  | "INVALID_DOCUMENT_TYPE";

const DEFAULT_MESSAGES: Record<DocumentIntegrityErrorCode, string> = {
  DOCUMENT_ID_MISMATCH: "El documento no coincide con el registro guardado.",
  DOCUMENT_LOCKED: "Este documento ya está emitido y no admite edición directa.",
  DOCUMENT_ALREADY_ISSUED: "Este documento ya está emitido.",
  DOCUMENT_NOT_ISSUED: "Primero hay que emitir el documento.",
  DOCUMENT_NUMBER_REQUIRED: "El documento necesita un número válido antes de emitirse.",
  GENERIC_UPDATE_WOULD_LOCK_DOCUMENT:
    "La edición genérica no puede emitir ni bloquear documentos.",
  INVALID_DOCUMENT_TYPE: "La operación no es válida para este tipo de documento.",
};

export class DocumentIntegrityError extends Error {
  readonly code: DocumentIntegrityErrorCode;

  constructor(code: DocumentIntegrityErrorCode, message = DEFAULT_MESSAGES[code]) {
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

function hasIntegrityRelationship(doc: Document): boolean {
  return Boolean(doc.rectification || doc.rectifiedById);
}

export function deriveDocumentLifecycle(doc: Document): DocumentLifecycle {
  if (doc.documentLifecycle === "canceled" || doc.status === "anulada") {
    return "canceled";
  }

  if (
    doc.documentLifecycle === "issued" ||
    hasLegacyIssuedStatus(doc) ||
    hasIntegrityRelationship(doc)
  ) {
    return "issued";
  }

  return "draft";
}

export function deriveIntegrityLock(doc: Document): DocumentIntegrityLock {
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
  if (deriveDocumentLifecycle(doc) !== "draft" || isDocumentIntegrityLocked(doc)) {
    throw new DocumentIntegrityError("DOCUMENT_ALREADY_ISSUED");
  }

  assertDocumentEditable(doc);
  assertValidDocumentNumber(doc);

  const timestamp = nowIso(issuedAt);

  return {
    ...doc,
    issuer: doc.issuer ?? captureIssuerSnapshot(profile),
    status: "enviado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    deliveryStatus: "not_sent",
    issuedAt: doc.issuedAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function markDocumentSent(
  doc: Document,
  sentAt: Date | string = new Date(),
): Document {
  assertIssued(doc);

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
  assertIssued(doc);

  if (doc.type !== "factura" && doc.type !== "recibo") {
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
  assertIssued(doc);

  if (doc.type !== "presupuesto") {
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
