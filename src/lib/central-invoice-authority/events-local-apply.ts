import { issueDraftDocumentWithStatus } from "@/lib/document-integrity/issuance";
import { originalStatusAfterRectification } from "@/lib/rectificativas";
import type {
  BusinessProfile,
  Document,
  DocumentCentralInvoiceAuthorityLinkV1,
  DocumentKind,
} from "@/lib/types";

import { CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY } from "./document-form-canary";
import type { CentralInvoiceAuthorityPulledBrowserEvent } from "./events-client";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_APPLY =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_APPLY_V1";

export type CentralInvoiceAuthorityEventsLocalApplyAction =
  | "inserted"
  | "metadata_attached"
  | "collection_updated"
  | "relationship_updated";

export type CentralInvoiceAuthorityEventsLocalSkipCode =
  | "unsupported_event_type"
  | "invalid_document_payload"
  | "existing_document_current"
  | "existing_document_newer";

export type CentralInvoiceAuthorityEventsLocalConflictCode =
  | "duplicate_fiscal_number"
  | "local_document_id_collision"
  | "central_identity_number_mismatch"
  | "rectification_original_missing"
  | "rectification_original_already_linked";

export interface CentralInvoiceAuthorityEventsLocalApplyInput {
  documents: Document[];
  profile: BusinessProfile;
  events: CentralInvoiceAuthorityPulledBrowserEvent[];
  receivedAt?: string;
}

export interface CentralInvoiceAuthorityEventsLocalApplied {
  eventId: string;
  documentId: string;
  fullNumber: string;
  action: CentralInvoiceAuthorityEventsLocalApplyAction;
}

export interface CentralInvoiceAuthorityEventsLocalSkipped {
  eventId: string;
  fullNumber: string;
  code: CentralInvoiceAuthorityEventsLocalSkipCode;
}

export interface CentralInvoiceAuthorityEventsLocalConflict {
  eventId: string;
  fullNumber: string;
  code: CentralInvoiceAuthorityEventsLocalConflictCode;
  localDocumentId?: string;
  centralDocumentId?: string;
}

export interface CentralInvoiceAuthorityEventsLocalApplyResult {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_APPLY;
  documents: Document[];
  applied: CentralInvoiceAuthorityEventsLocalApplied[];
  skipped: CentralInvoiceAuthorityEventsLocalSkipped[];
  conflicts: CentralInvoiceAuthorityEventsLocalConflict[];
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeNumber(value: string): string {
  return value.trim().toUpperCase();
}

function kindForDocument(doc: Pick<Document, "type" | "rectification">): DocumentKind {
  if (doc.type === "factura" && doc.rectification) {
    return "factura_rectificativa";
  }
  return doc.type;
}

function kindForEvent(
  event: CentralInvoiceAuthorityPulledBrowserEvent,
): Extract<DocumentKind, "factura" | "factura_rectificativa"> | null {
  if (
    event.eventType === "invoice_issued" ||
    event.eventType === "invoice_collection_updated" ||
    event.eventType === "invoice_relationship_updated"
  ) {
    return "factura";
  }
  if (event.eventType === "rectification_issued") {
    return "factura_rectificativa";
  }
  return null;
}

function isSupportedDocumentPayload(value: unknown): value is Document {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.type === "factura" &&
    typeof value.number === "string" &&
    typeof value.date === "string" &&
    isRecord(value.client) &&
    Array.isArray(value.items) &&
    typeof value.status === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function documentFromEventPayload(
  event: CentralInvoiceAuthorityPulledBrowserEvent,
): Document | null {
  const payload = event.documentPayload;
  if (isRecord(payload)) {
    if (
      payload.schema === CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY &&
      isSupportedDocumentPayload(payload.document)
    ) {
      return payload.document;
    }
    if (isSupportedDocumentPayload(payload)) {
      return payload;
    }
  }
  return null;
}

function centralLinkFromEvent(
  event: CentralInvoiceAuthorityPulledBrowserEvent,
  receivedAt: string,
): DocumentCentralInvoiceAuthorityLinkV1 {
  return {
    schemaVersion: 1,
    source: "central_invoice_authority",
    serverDocumentId: event.documentId,
    identityId: event.identityId,
    outboxEventId: event.eventId,
    eventType: event.eventType,
    fullNumber: event.fullNumber,
    sequence: event.sequence,
    documentVersion: event.documentVersion,
    emittedHash: event.emittedHash,
    receivedAt,
  };
}

function matchesCentralIdentity(
  doc: Document,
  event: CentralInvoiceAuthorityPulledBrowserEvent,
): boolean {
  const link = doc.centralInvoiceAuthority;
  return Boolean(
    link &&
      (link.serverDocumentId === event.documentId ||
        link.identityId === event.identityId),
  );
}

function hasSameFiscalNumber(
  doc: Document,
  event: CentralInvoiceAuthorityPulledBrowserEvent,
): boolean {
  const eventKind = kindForEvent(event);
  return Boolean(
    eventKind &&
      kindForDocument(doc) === eventKind &&
      normalizeNumber(doc.number) === normalizeNumber(event.fullNumber),
  );
}

function attachCentralMetadata(
  doc: Document,
  event: CentralInvoiceAuthorityPulledBrowserEvent,
  receivedAt: string,
): Document {
  return {
    ...doc,
    centralInvoiceAuthority: centralLinkFromEvent(event, receivedAt),
  };
}

function isCollectionUpdateEvent(
  event: CentralInvoiceAuthorityPulledBrowserEvent,
): boolean {
  return event.eventType === "invoice_collection_updated";
}

function isRelationshipUpdateEvent(
  event: CentralInvoiceAuthorityPulledBrowserEvent,
): boolean {
  return event.eventType === "invoice_relationship_updated";
}

function isSupportedCollectionStatus(
  doc: Document,
): doc is Document & {
  status: "enviado" | "pagado" | "vencido";
  paymentStatus: "pending" | "paid" | "overdue";
} {
  return (
    doc.type === "factura" &&
    !doc.rectification &&
    ((doc.status === "pagado" &&
      doc.paymentStatus === "paid" &&
      typeof doc.paidAt === "string") ||
      (doc.status === "enviado" &&
        doc.paymentStatus === "pending" &&
        doc.paidAt === undefined) ||
      (doc.status === "vencido" &&
        doc.paymentStatus === "overdue" &&
        doc.paidAt === undefined))
  );
}

function applyCollectionStatusFromEvent(
  existing: Document,
  event: CentralInvoiceAuthorityPulledBrowserEvent,
  receivedAt: string,
): Document | null {
  const incoming = documentFromEventPayload(event);
  if (
    !incoming ||
    !isSupportedCollectionStatus(incoming) ||
    kindForDocument(incoming) !== "factura" ||
    normalizeNumber(incoming.number) !== normalizeNumber(event.fullNumber)
  ) {
    return null;
  }

  return attachCentralMetadata(
    {
      ...existing,
      status: incoming.status,
      paymentStatus: incoming.paymentStatus,
      paidAt: incoming.paidAt,
      updatedAt: incoming.updatedAt,
    },
    event,
    receivedAt,
  );
}

function applyRelationshipFromEvent(
  existing: Document,
  event: CentralInvoiceAuthorityPulledBrowserEvent,
  receivedAt: string,
): Document | null {
  const incoming = documentFromEventPayload(event);
  if (
    !incoming ||
    incoming.type !== "factura" ||
    incoming.rectification ||
    normalizeNumber(incoming.number) !== normalizeNumber(event.fullNumber)
  ) {
    return null;
  }

  const relationship =
    incoming.sourceQuoteDocumentId && incoming.sourceQuoteNumber
      ? {
          sourceQuoteDocumentId: incoming.sourceQuoteDocumentId,
          sourceQuoteNumber: incoming.sourceQuoteNumber,
        }
      : {
          sourceQuoteDocumentId: undefined,
          sourceQuoteNumber: undefined,
        };

  return attachCentralMetadata(
    {
      ...existing,
      ...relationship,
      updatedAt: incoming.updatedAt,
    },
    event,
    receivedAt,
  );
}

function stripLocalIntegrityForReceivedDraft(
  doc: Document,
  event: CentralInvoiceAuthorityPulledBrowserEvent,
): Document {
  return {
    ...doc,
    number: event.fullNumber,
    status: "borrador",
    documentSnapshot: undefined,
    pdfSnapshot: undefined,
    snapshotSeal: undefined,
    snapshotIntegrityRequired: undefined,
    snapshotIntegrity: undefined,
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    deliveryStatus: undefined,
    paymentStatus: undefined,
    acceptanceStatus: undefined,
    issuedAt: undefined,
    sentAt: undefined,
    paidAt: undefined,
    acceptedAt: undefined,
    centralInvoiceAuthority: undefined,
  };
}

function normalizeRequestedStatus(status: Document["status"]): Document["status"] {
  if (status === "pagado" || status === "vencido") return status;
  return "enviado";
}

function buildReceivedIssuedDocument(input: {
  doc: Document;
  event: CentralInvoiceAuthorityPulledBrowserEvent;
  profile: BusinessProfile;
  receivedAt: string;
}): Document {
  const issued = issueDraftDocumentWithStatus(
    stripLocalIntegrityForReceivedDraft(input.doc, input.event),
    normalizeRequestedStatus(input.doc.status),
    input.profile,
    input.doc.issuedAt ?? input.event.createdAt,
  );

  return attachCentralMetadata(issued, input.event, input.receivedAt);
}

function applyReceivedRectificationToOriginal(
  documents: Document[],
  rectificativa: Document,
  updatedAt: string,
): Document[] {
  if (!rectificativa.rectification || rectificativa.status === "borrador") {
    return documents;
  }

  const originalId = rectificativa.rectification.originalDocumentId;
  return documents.map((doc) => {
    if (doc.id !== originalId) return doc;
    return {
      ...doc,
      status: originalStatusAfterRectification(rectificativa.rectification!.type),
      rectifiedById: rectificativa.id,
      updatedAt,
    };
  });
}

function rectificationRelationConflict(
  documents: Document[],
  incoming: Document,
  event: CentralInvoiceAuthorityPulledBrowserEvent,
): CentralInvoiceAuthorityEventsLocalConflict | null {
  if (!incoming.rectification) return null;
  const original = documents.find(
    (doc) => doc.id === incoming.rectification?.originalDocumentId,
  );
  if (!original) {
    return {
      eventId: event.eventId,
      fullNumber: event.fullNumber,
      code: "rectification_original_missing",
      centralDocumentId: event.documentId,
    };
  }
  if (original.rectifiedById && original.rectifiedById !== incoming.id) {
    return {
      eventId: event.eventId,
      fullNumber: event.fullNumber,
      code: "rectification_original_already_linked",
      localDocumentId: original.id,
      centralDocumentId: event.documentId,
    };
  }
  return null;
}

function resolveRectificationOriginalReference(
  documents: Document[],
  incoming: Document,
): Document {
  const rectification = incoming.rectification;
  if (!rectification) return incoming;
  if (
    documents.some(
      (document) => document.id === rectification.originalDocumentId,
    )
  ) {
    return incoming;
  }

  const originalsByFiscalNumber = documents.filter(
    (document) =>
      document.type === "factura" &&
      !document.rectification &&
      normalizeNumber(document.number) ===
        normalizeNumber(rectification.originalNumber),
  );
  if (originalsByFiscalNumber.length !== 1) return incoming;

  return {
    ...incoming,
    rectification: {
      ...rectification,
      originalDocumentId: originalsByFiscalNumber[0]!.id,
    },
  };
}

export function applyCentralInvoiceAuthorityPulledEventsToDocuments(
  input: CentralInvoiceAuthorityEventsLocalApplyInput,
): CentralInvoiceAuthorityEventsLocalApplyResult {
  const receivedAt = input.receivedAt ?? new Date().toISOString();
  let documents = [...input.documents];
  const applied: CentralInvoiceAuthorityEventsLocalApplied[] = [];
  const skipped: CentralInvoiceAuthorityEventsLocalSkipped[] = [];
  const conflicts: CentralInvoiceAuthorityEventsLocalConflict[] = [];

  for (const event of input.events) {
    const eventKind = kindForEvent(event);
    if (!eventKind) {
      skipped.push({
        eventId: event.eventId,
        fullNumber: event.fullNumber,
        code: "unsupported_event_type",
      });
      continue;
    }

    const centralIndex = documents.findIndex((doc) =>
      matchesCentralIdentity(doc, event),
    );
    if (centralIndex >= 0) {
      const existing = documents[centralIndex];
      if (normalizeNumber(existing.number) !== normalizeNumber(event.fullNumber)) {
        conflicts.push({
          eventId: event.eventId,
          fullNumber: event.fullNumber,
          code: "central_identity_number_mismatch",
          localDocumentId: existing.id,
          centralDocumentId: event.documentId,
        });
        continue;
      }

      const currentVersion =
        existing.centralInvoiceAuthority?.documentVersion ?? 0;
      if (currentVersion > event.documentVersion) {
        skipped.push({
          eventId: event.eventId,
          fullNumber: event.fullNumber,
          code: "existing_document_newer",
        });
        continue;
      }
      if (
        currentVersion === event.documentVersion &&
        existing.centralInvoiceAuthority?.outboxEventId === event.eventId
      ) {
        skipped.push({
          eventId: event.eventId,
          fullNumber: event.fullNumber,
          code: "existing_document_current",
        });
        continue;
      }

      const nextDocument = isCollectionUpdateEvent(event)
        ? applyCollectionStatusFromEvent(existing, event, receivedAt)
        : isRelationshipUpdateEvent(event)
          ? applyRelationshipFromEvent(existing, event, receivedAt)
          : attachCentralMetadata(documents[centralIndex]!, event, receivedAt);

      if (!nextDocument) {
        skipped.push({
          eventId: event.eventId,
          fullNumber: event.fullNumber,
          code: "invalid_document_payload",
        });
        continue;
      }

      documents = documents.map((doc, index) =>
        index === centralIndex ? nextDocument : doc,
      );
      documents = applyReceivedRectificationToOriginal(
        documents,
        nextDocument,
        receivedAt,
      );
      applied.push({
        eventId: event.eventId,
        documentId: existing.id,
        fullNumber: event.fullNumber,
        action: isCollectionUpdateEvent(event)
          ? "collection_updated"
          : isRelationshipUpdateEvent(event)
            ? "relationship_updated"
            : "metadata_attached",
      });
      continue;
    }

    const incomingPayload = documentFromEventPayload(event);
    const incoming = incomingPayload
      ? resolveRectificationOriginalReference(documents, incomingPayload)
      : null;
    if (
      !incoming ||
      kindForDocument(incoming) !== eventKind ||
      normalizeNumber(incoming.number) !== normalizeNumber(event.fullNumber)
    ) {
      skipped.push({
        eventId: event.eventId,
        fullNumber: event.fullNumber,
        code: "invalid_document_payload",
      });
      continue;
    }

    const relationConflict = rectificationRelationConflict(
      documents,
      incoming,
      event,
    );
    if (relationConflict) {
      conflicts.push(relationConflict);
      continue;
    }

    const sameIdIndex = documents.findIndex((doc) => doc.id === incoming.id);
    if (sameIdIndex >= 0) {
      const existing = documents[sameIdIndex];
      if (
        hasSameFiscalNumber(existing, event) &&
        !existing.centralInvoiceAuthority
      ) {
        documents = documents.map((doc, index) =>
          index === sameIdIndex
            ? attachCentralMetadata(doc, event, receivedAt)
            : doc,
        );
        documents = applyReceivedRectificationToOriginal(
          documents,
          documents[sameIdIndex]!,
          receivedAt,
        );
        applied.push({
          eventId: event.eventId,
          documentId: existing.id,
          fullNumber: event.fullNumber,
          action: "metadata_attached",
        });
        continue;
      }
      conflicts.push({
        eventId: event.eventId,
        fullNumber: event.fullNumber,
        code: "local_document_id_collision",
        localDocumentId: existing.id,
        centralDocumentId: event.documentId,
      });
      continue;
    }

    const duplicateNumber = documents.find((doc) =>
      hasSameFiscalNumber(doc, event),
    );
    if (duplicateNumber) {
      conflicts.push({
        eventId: event.eventId,
        fullNumber: event.fullNumber,
        code: "duplicate_fiscal_number",
        localDocumentId: duplicateNumber.id,
        centralDocumentId: event.documentId,
      });
      continue;
    }

    const inserted = buildReceivedIssuedDocument({
      doc: incoming,
      event,
      profile: input.profile,
      receivedAt,
    });
    documents = applyReceivedRectificationToOriginal(
      [...documents, inserted],
      inserted,
      receivedAt,
    );
    applied.push({
      eventId: event.eventId,
      documentId: inserted.id,
      fullNumber: event.fullNumber,
      action: "inserted",
    });
  }

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_APPLY,
    documents,
    applied,
    skipped,
    conflicts,
  };
}
