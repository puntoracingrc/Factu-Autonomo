import { issueDraftDocumentWithStatus } from "@/lib/document-integrity/issuance";
import { markDocumentSent } from "@/lib/document-integrity";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import { profileForHistoricalDerivedDocument } from "@/lib/document-integrity/derived-issuance";
import { withDocumentRelationshipIntegritySignals } from "@/lib/document-integrity/relationships";
import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import {
  buildReceiptFromInvoice,
  inspectReceiptGeneration,
} from "@/lib/receipts";
import type {
  AppData,
  BusinessProfile,
  Document,
  DocumentCentralBusinessReceiptAuthorityV1,
} from "@/lib/types";
import { isSharedDocumentDraft } from "./shared-document-drafts";
import { normalizeDocumentTemplate } from "@/lib/document-templates";

export const CENTRAL_BUSINESS_RECEIPT_AUTHORITY =
  "CENTRAL_BUSINESS_RECEIPT_AUTHORITY_V1";

export type CentralBusinessReceiptMaterializationErrorCode =
  | "INVALID_RECEIPT_AUTHORITY"
  | "RECEIPT_SOURCE_MISSING"
  | "RECEIPT_SOURCE_BLOCKED"
  | "RECEIPT_PAYLOAD_MISMATCH"
  | "RECEIPT_RELATIONSHIP_INVALID";

export class CentralBusinessReceiptMaterializationError extends Error {
  readonly code: CentralBusinessReceiptMaterializationErrorCode;

  constructor(
    code: CentralBusinessReceiptMaterializationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CentralBusinessReceiptMaterializationError";
    this.code = code;
  }
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stable(value: unknown): string {
  return stableStringifySnapshot(JSON.parse(JSON.stringify(value)));
}

function validAuthority(
  value: Document["centralBusinessReceiptAuthority"],
): value is DocumentCentralBusinessReceiptAuthorityV1 {
  return Boolean(
    value?.schemaVersion === 1 &&
    value.source === "central_business_authority" &&
    typeof value.issuedAt === "string" &&
    !Number.isNaN(Date.parse(value.issuedAt)) &&
    (value.sentAt === undefined ||
      (typeof value.sentAt === "string" &&
        !Number.isNaN(Date.parse(value.sentAt)))) &&
    (value.manualContext === undefined ||
      (Array.isArray(value.manualContext?.iva?.rates) &&
        value.manualContext.iva.rates.every(
          (rate) => typeof rate === "number" && Number.isFinite(rate),
        ) &&
        Number.isFinite(value.manualContext.iva.defaultRate) &&
        Boolean(value.manualContext.template) &&
        stable(value.manualContext.template) ===
          stable(normalizeDocumentTemplate(value.manualContext.template)))),
  );
}

export function isCentralBusinessReceipt(document: Document): boolean {
  return (
    document.type === "recibo" &&
    validAuthority(document.centralBusinessReceiptAuthority)
  );
}

export function buildCentralManualReceiptPayloadWithoutNumber(
  draft: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">,
  profile: BusinessProfile,
  id: string,
  now: string,
): Record<string, unknown> {
  if (
    draft.type !== "recibo" ||
    !["enviado", "pagado", "vencido"].includes(draft.status) ||
    !isSharedDocumentDraft({
      ...draft,
      status: "borrador",
      id,
      number: "BORRADOR",
      createdAt: now,
      updatedAt: now,
    })
  )
    throw new Error(
      "El recibo manual contiene datos de emisión incompatibles.",
    );
  const payload: Record<string, unknown> = {
    ...draft,
    id,
    issuer: captureIssuerSnapshot(profile, now),
    createdAt: now,
    updatedAt: now,
    centralBusinessReceiptAuthority: {
      schemaVersion: 1,
      source: "central_business_authority",
      issuedAt: now,
      manualContext: {
        iva: profile.iva,
        vatExempt: profile.vatExempt,
        template: normalizeDocumentTemplate(profile.documentTemplate),
      },
    },
  };
  delete payload.documentLifecycle;
  delete payload.integrityLock;
  delete payload.deliveryStatus;
  delete payload.paymentStatus;
  delete payload.acceptanceStatus;
  return jsonClone(payload);
}

function comparableReceiptDraft(document: Document): Record<string, unknown> {
  return {
    type: document.type,
    date: document.date,
    client: document.client,
    items: document.items.map(receiptLineForCentralPayload),
    ...(document.notes === undefined ? {} : { notes: document.notes }),
    ...(document.paymentTerms === undefined
      ? {}
      : { paymentTerms: document.paymentTerms }),
    status: document.status,
    sourceDocumentId: document.sourceDocumentId,
  };
}

function receiptLineForCentralPayload(
  item: Document["items"][number],
): Document["items"][number] {
  return {
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    ...(item.unit === undefined ? {} : { unit: item.unit }),
    unitPrice: item.unitPrice,
    ...(item.grossUnitPrice === undefined
      ? {}
      : { grossUnitPrice: item.grossUnitPrice }),
    ivaPercent: item.ivaPercent,
  };
}

export function buildCentralBusinessReceiptPayloadWithoutNumber(input: {
  data: AppData;
  invoiceId: string;
  receiptId: string;
  issuedAt: string;
  createLineId: () => string;
}): Record<string, unknown> {
  const inspection = inspectReceiptGeneration(
    input.data.documents,
    input.invoiceId,
  );
  if (inspection.status !== "eligible") {
    throw new CentralBusinessReceiptMaterializationError(
      inspection.status === "blocked" &&
        inspection.reason === "invoice_not_found"
        ? "RECEIPT_SOURCE_MISSING"
        : "RECEIPT_SOURCE_BLOCKED",
      "La factura no permite crear un recibo central.",
    );
  }

  const sourceSnapshot = inspection.invoice.documentSnapshot;
  if (!sourceSnapshot) {
    throw new CentralBusinessReceiptMaterializationError(
      "RECEIPT_SOURCE_BLOCKED",
      "La factura no conserva un snapshot valido.",
    );
  }
  const profile = profileForHistoricalDerivedDocument(
    sourceSnapshot,
    input.data.profile,
  );
  const receiptDraft = buildReceiptFromInvoice(inspection.invoice, profile, {
    now: input.issuedAt,
    createId: input.createLineId,
  });
  const provisional: Document = {
    ...receiptDraft,
    items: receiptDraft.items.map(receiptLineForCentralPayload),
    id: input.receiptId,
    number: "CENTRAL-PENDING",
    issuer: captureIssuerSnapshot(profile, input.issuedAt),
    centralBusinessReceiptAuthority: {
      schemaVersion: 1,
      source: "central_business_authority",
      issuedAt: input.issuedAt,
    },
    createdAt: input.issuedAt,
    updatedAt: input.issuedAt,
  };
  const payload = jsonClone(provisional) as unknown as Record<string, unknown>;
  delete payload.number;
  return payload;
}

export function centralBusinessReceiptServerPayload(
  document: Document,
): Document {
  if (!isCentralBusinessReceipt(document)) return document;

  const payload = jsonClone(document) as Document & Record<string, unknown>;
  payload.updatedAt = document.centralBusinessReceiptAuthority!.issuedAt;
  if (document.deliveryStatus === "sent" && document.sentAt) {
    payload.centralBusinessReceiptAuthority = {
      ...document.centralBusinessReceiptAuthority!,
      sentAt: document.sentAt,
    };
  }
  delete payload.documentSnapshot;
  delete payload.pdfSnapshot;
  delete payload.snapshotSeal;
  delete payload.snapshotIntegrityRequired;
  delete payload.snapshotIntegrity;
  delete payload.documentLifecycle;
  delete payload.integrityLock;
  delete payload.deliveryStatus;
  delete payload.paymentStatus;
  delete payload.acceptanceStatus;
  delete payload.issuedAt;
  delete payload.sentAt;
  delete payload.paidAt;
  delete payload.acceptedAt;
  return payload;
}

/** A delivery overlay can change; the source, body and preserved evidence cannot. */
export function applyCentralReceiptDelivery(
  existing: Document,
  incoming: Document,
): Document {
  const current = centralBusinessReceiptServerPayload(existing);
  const clean = (document: Document) => {
    const payload = jsonClone(document);
    if (payload.centralBusinessReceiptAuthority)
      delete payload.centralBusinessReceiptAuthority.sentAt;
    return payload;
  };
  if (
    !validAuthority(incoming.centralBusinessReceiptAuthority) ||
    stable(clean(current)) !== stable(clean(incoming))
  ) {
    throw new CentralBusinessReceiptMaterializationError(
      "RECEIPT_PAYLOAD_MISMATCH",
      "El recibo central no permite cambiar su contenido emitido.",
    );
  }
  const sentAt = incoming.centralBusinessReceiptAuthority.sentAt;
  if (!sentAt) {
    if (current.centralBusinessReceiptAuthority?.sentAt)
      throw new CentralBusinessReceiptMaterializationError(
        "RECEIPT_PAYLOAD_MISMATCH",
        "No se puede retirar una marca de envío ya confirmada.",
      );
    return existing;
  }
  return {
    ...markDocumentSent(existing, sentAt),
    centralBusinessReceiptAuthority: incoming.centralBusinessReceiptAuthority,
  };
}

export interface CentralBusinessReceiptMaterializationTransition {
  data: AppData;
  receipt: Document;
}

export function materializeCentralBusinessReceipt(input: {
  data: AppData;
  receiptPayload: Document;
}): CentralBusinessReceiptMaterializationTransition {
  const raw = input.receiptPayload;
  const authority = raw.centralBusinessReceiptAuthority;
  if (
    raw.type === "recibo" &&
    validAuthority(authority) &&
    authority.manualContext
  ) {
    if (
      raw.sourceDocumentId ||
      !raw.issuer ||
      !["enviado", "pagado", "vencido"].includes(raw.status) ||
      raw.createdAt !== authority.issuedAt ||
      raw.updatedAt !== authority.issuedAt ||
      raw.documentSnapshot ||
      raw.pdfSnapshot ||
      raw.snapshotSeal
    )
      throw new CentralBusinessReceiptMaterializationError(
        "INVALID_RECEIPT_AUTHORITY",
        "El recibo manual central no es válido.",
      );
    const context = authority.manualContext;
    const profile = {
      ...input.data.profile,
      ...raw.issuer,
      iva: context.iva,
      vatExempt: context.vatExempt,
      documentTemplate: context.template,
    };
    const issued = issueDraftDocumentWithStatus(
      {
        ...raw,
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      },
      raw.status,
      profile,
      authority.issuedAt,
    );
    const receipt = authority.sentAt
      ? markDocumentSent(issued, authority.sentAt)
      : issued;
    return {
      data: {
        ...input.data,
        documents: [
          ...input.data.documents.filter((doc) => doc.id !== raw.id),
          receipt,
        ],
      },
      receipt,
    };
  }
  if (
    raw.type !== "recibo" ||
    raw.status !== "pagado" ||
    !raw.sourceDocumentId ||
    !validAuthority(authority)
  ) {
    throw new CentralBusinessReceiptMaterializationError(
      "INVALID_RECEIPT_AUTHORITY",
      "El recibo central no contiene un contrato de materializacion valido.",
    );
  }

  const inspection = inspectReceiptGeneration(
    input.data.documents,
    raw.sourceDocumentId,
  );
  if (inspection.status === "blocked") {
    throw new CentralBusinessReceiptMaterializationError(
      inspection.reason === "invoice_not_found"
        ? "RECEIPT_SOURCE_MISSING"
        : "RECEIPT_SOURCE_BLOCKED",
      "La factura de origen no permite incorporar el recibo central.",
    );
  }
  if (inspection.status === "existing") {
    throw new CentralBusinessReceiptMaterializationError(
      "RECEIPT_RELATIONSHIP_INVALID",
      "La factura ya esta vinculada a otro recibo.",
    );
  }

  const sourceSnapshot = inspection.invoice.documentSnapshot;
  if (!sourceSnapshot) {
    throw new CentralBusinessReceiptMaterializationError(
      "RECEIPT_SOURCE_BLOCKED",
      "La factura de origen no conserva un snapshot valido.",
    );
  }
  const profile = profileForHistoricalDerivedDocument(
    sourceSnapshot,
    input.data.profile,
  );
  let lineIndex = 0;
  const expectedDraft = buildReceiptFromInvoice(inspection.invoice, profile, {
    now: authority.issuedAt,
    createId: () => raw.items[lineIndex++]?.id ?? "",
  });
  if (
    lineIndex !== raw.items.length ||
    stable(comparableReceiptDraft(raw)) !==
      stable(comparableReceiptDraft(expectedDraft as Document)) ||
    stable(raw.issuer) !==
      stable(captureIssuerSnapshot(profile, authority.issuedAt)) ||
    raw.createdAt !== authority.issuedAt ||
    raw.updatedAt !== authority.issuedAt
  ) {
    throw new CentralBusinessReceiptMaterializationError(
      "RECEIPT_PAYLOAD_MISMATCH",
      "El recibo central no reproduce la factura de origen.",
    );
  }

  const draft = jsonClone(raw) as Document & Record<string, unknown>;
  draft.status = "borrador";
  draft.documentLifecycle = "draft";
  draft.integrityLock = "unlocked";
  delete draft.documentSnapshot;
  delete draft.pdfSnapshot;
  delete draft.snapshotSeal;
  delete draft.snapshotIntegrityRequired;
  delete draft.snapshotIntegrity;
  delete draft.deliveryStatus;
  delete draft.paymentStatus;
  delete draft.acceptanceStatus;
  delete draft.issuedAt;
  delete draft.sentAt;
  delete draft.paidAt;
  delete draft.acceptedAt;

  const issued = issueDraftDocumentWithStatus(
    draft,
    "pagado",
    profile,
    authority.issuedAt,
  );
  const materialized = authority.sentAt
    ? markDocumentSent(issued, authority.sentAt)
    : issued;
  const linkedDocuments = [
    ...input.data.documents.map((document) =>
      document.id === inspection.invoice.id
        ? {
            ...document,
            receiptDocumentId: materialized.id,
            updatedAt: authority.issuedAt,
          }
        : document,
    ),
    materialized,
  ];
  const checked = withDocumentRelationshipIntegritySignals(linkedDocuments);
  const checkedReceipt = checked.find(
    (document) => document.id === materialized.id,
  );
  const checkedSource = checked.find(
    (document) => document.id === inspection.invoice.id,
  );
  if (
    !checkedReceipt ||
    !checkedSource ||
    checkedReceipt.snapshotIntegrity?.status === "blocked" ||
    checkedSource.snapshotIntegrity?.status === "blocked"
  ) {
    throw new CentralBusinessReceiptMaterializationError(
      "RECEIPT_RELATIONSHIP_INVALID",
      "El vinculo entre la factura y el recibo central no es valido.",
    );
  }

  return {
    data: { ...input.data, documents: linkedDocuments },
    receipt: materialized,
  };
}
