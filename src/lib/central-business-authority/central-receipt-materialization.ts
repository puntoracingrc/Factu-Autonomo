import { issueDraftDocumentWithStatus } from "@/lib/document-integrity/issuance";
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
  Document,
  DocumentCentralBusinessReceiptAuthorityV1,
} from "@/lib/types";

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
      !Number.isNaN(Date.parse(value.issuedAt)),
  );
}

export function isCentralBusinessReceipt(document: Document): boolean {
  return (
    document.type === "recibo" &&
    validAuthority(document.centralBusinessReceiptAuthority)
  );
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
      inspection.status === "blocked" && inspection.reason === "invoice_not_found"
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

  const materialized = issueDraftDocumentWithStatus(
    draft,
    "pagado",
    profile,
    authority.issuedAt,
  );
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
