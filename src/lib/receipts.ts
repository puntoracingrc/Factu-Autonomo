import { todayISO } from "./calculations";
import {
  assertDocumentSnapshotsIntegrity,
  buildDocumentSnapshot,
  inspectDocumentSnapshotsIntegrity,
  stableStringifySnapshot,
} from "./document-integrity";
import { canPhysicallyDeleteDocument } from "./document-integrity/deletion";
import { profileForHistoricalDerivedDocument } from "./document-integrity/derived-issuance";
import { buildCanonicalDocumentForProtectedEffect } from "./document-integrity/pdf-source";
import { withDocumentRelationshipIntegritySignals } from "./document-integrity/relationships";
import {
  getDocumentYear,
  renumberDocumentsForKindYear,
} from "./documents";
import { validateDocumentEmission } from "./invoice-compliance";
import type {
  BusinessProfile,
  Document,
  DocumentSnapshot,
  NumberingSettings,
} from "./types";

function isReceiptLike(document: Document): boolean {
  return (
    document.type === "recibo" ||
    document.documentSnapshot?.documentType === "recibo"
  );
}

function reproducibleReceiptContent(snapshot: DocumentSnapshot): string {
  return stableStringifySnapshot({
    customer: snapshot.customer,
    items: snapshot.items.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      unit: item.unit?.trim() ?? "",
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
      subtotal: item.subtotal,
      ivaAmount: item.ivaAmount,
      total: item.total,
    })),
    taxSummary: snapshot.taxSummary,
  });
}

function paymentStatusAfterUnmark(
  status: Document["status"],
): Document["paymentStatus"] {
  return status === "vencido" ? "overdue" : "pending";
}

export function buildReceiptFromInvoice(
  invoice: Document,
  profile: BusinessProfile,
): Omit<Document, "id" | "number" | "createdAt" | "updatedAt"> {
  assertDocumentSnapshotsIntegrity(invoice, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });
  const canonicalInvoice = buildCanonicalDocumentForProtectedEffect(
    invoice,
    profile,
  );
  if (canonicalInvoice.type !== "factura") {
    throw new Error("Solo una factura canónica puede generar un recibo.");
  }
  if (canonicalInvoice.receiptDocumentId) {
    throw new Error("La factura ya conserva un vínculo de recibo.");
  }
  if (
    canonicalInvoice.rectification ||
    canonicalInvoice.documentSnapshot?.rectification
  ) {
    throw new Error("Una factura rectificativa no puede generar un recibo.");
  }
  const historicalProfile = profileForHistoricalDerivedDocument(
    canonicalInvoice.documentSnapshot!,
    profile,
  );
  const sourceCompliance = validateDocumentEmission(
    canonicalInvoice,
    historicalProfile,
    "factura",
  );
  if (!sourceCompliance.ok) {
    throw new Error(
      sourceCompliance.message ??
        "La factura de origen no cumple los requisitos para generar un recibo.",
    );
  }
  const today = todayISO();
  const receiptDate = canonicalInvoice.date > today
    ? canonicalInvoice.date
    : today;

  const receipt = {
    type: "recibo",
    date: receiptDate,
    client: { ...canonicalInvoice.client },
    items: canonicalInvoice.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    })),
    notes: `Pago de la factura ${canonicalInvoice.number}`,
    paymentTerms: canonicalInvoice.paymentTerms,
    status: "pagado",
    sourceDocumentId: invoice.id,
  } satisfies Omit<Document, "id" | "number" | "createdAt" | "updatedAt">;
  const receiptCompliance = validateDocumentEmission(
    receipt,
    historicalProfile,
    "recibo",
  );
  if (!receiptCompliance.ok) {
    throw new Error(
      receiptCompliance.message ??
        "El recibo derivado no cumple los requisitos de emisión.",
    );
  }

  const previewTimestamp = new Date().toISOString();
  const projectedSnapshot = buildDocumentSnapshot(
    {
      ...receipt,
      id: "receipt-integrity-preview",
      number: "R-PREVIEW",
      createdAt: previewTimestamp,
      updatedAt: previewTimestamp,
    },
    historicalProfile,
    { capturedAt: previewTimestamp },
  );
  if (
    reproducibleReceiptContent(canonicalInvoice.documentSnapshot!) !==
    reproducibleReceiptContent(projectedSnapshot)
  ) {
    throw new Error(
      "El recibo no puede reproducir exactamente los importes congelados de la factura de origen.",
    );
  }

  return receipt;
}

export function receiptClaimsForInvoice(
  documents: Document[],
  invoiceId: string,
  receiptDocumentId?: string,
): Document[] {
  return documents.filter(
    (document) =>
      isReceiptLike(document) &&
      (document.id === receiptDocumentId ||
        document.sourceDocumentId === invoiceId ||
        document.documentSnapshot?.sourceDocumentId === invoiceId),
  );
}

export function findReceiptForInvoice(
  documents: Document[],
  invoiceId: string,
  receiptDocumentId?: string,
): Document | undefined {
  const candidates = receiptClaimsForInvoice(
    documents,
    invoiceId,
    receiptDocumentId,
  );
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function isAutoGeneratedReceipt(doc: Document): boolean {
  // Clasificación conservadora para no duplicar ingresos: todo recibo que
  // reclame una factura de origen, en vivo o en el snapshot congelado, se trata
  // como vinculado. La acreditación de esa relación es una comprobación
  // distinta y más estricta.
  return Boolean(
    isReceiptLike(doc) &&
      (doc.sourceDocumentId || doc.documentSnapshot?.sourceDocumentId),
  );
}

export function hasFrozenAutoGeneratedReceiptOrigin(doc: Document): boolean {
  return Boolean(
    doc.documentSnapshot?.documentType === "recibo" &&
      doc.sourceDocumentId &&
      doc.documentSnapshot?.sourceDocumentId === doc.sourceDocumentId &&
      Object.prototype.hasOwnProperty.call(
        doc.documentSnapshot,
        "sourceDocumentId",
      ) &&
      inspectDocumentSnapshotsIntegrity(doc, {
        requireDocumentSnapshot: true,
        requirePdfSnapshot: true,
        requireSnapshotSeal: true,
      }).ok,
  );
}

export function canDeleteAutoGeneratedReceiptOnUnmark(doc: Document): boolean {
  return (
    doc.type === "recibo" &&
    Boolean(doc.sourceDocumentId) &&
    canPhysicallyDeleteDocument(doc)
  );
}

export interface UnmarkInvoiceCollectionResult {
  documents: Document[];
  removedReceiptId?: string;
  preservedReceiptId?: string;
  renumberYear?: number;
}

export function findUniqueReceiptSourceInvoice(
  documents: Document[],
  invoiceId: string,
): Document | undefined {
  const matchingInvoices = documents.filter((doc) => doc.id === invoiceId);
  if (matchingInvoices.length !== 1) return undefined;

  const invoice = matchingInvoices[0];
  if (
    invoice.type !== "factura" ||
    invoice.snapshotIntegrity?.status === "blocked"
  ) {
    return undefined;
  }

  const relationshipChecked = withDocumentRelationshipIntegritySignals(documents);
  const relationshipCheckedInvoice = relationshipChecked.find(
    (doc) => doc.id === invoiceId,
  );
  if (relationshipCheckedInvoice?.snapshotIntegrity?.status === "blocked") {
    return undefined;
  }

  return invoice;
}

export function unmarkInvoiceCollection(
  documents: Document[],
  invoiceId: string,
  nextStatus: Document["status"],
  updatedAt: string,
  numbering?: NumberingSettings,
): UnmarkInvoiceCollectionResult {
  const invoice = findUniqueReceiptSourceInvoice(documents, invoiceId);
  if (!invoice) {
    return { documents };
  }
  try {
    assertDocumentSnapshotsIntegrity(invoice, {
      requireDocumentSnapshot: true,
      requirePdfSnapshot: true,
      requireSnapshotSeal: true,
    });
  } catch {
    return { documents };
  }
  if (invoice.documentSnapshot?.documentType !== "factura") {
    return { documents };
  }

  const receiptCandidates = receiptClaimsForInvoice(
    documents,
    invoice.id,
    invoice.receiptDocumentId,
  );
  if (
    receiptCandidates.length > 1 ||
    (invoice.receiptDocumentId && receiptCandidates.length !== 1)
  ) {
    return { documents };
  }
  const receipt = receiptCandidates[0];
  if (
    receipt &&
    documents.filter((document) => document.id === receipt.id).length !== 1
  ) {
    return { documents };
  }

  // Una vez emitido el recibo, deshacer solo el cobro rompería la relación
  // fiscal sellada. La pareja se conserva hasta disponer de un flujo explícito
  // de anulación/rectificación del recibo.
  if (
    receipt &&
    (receipt.sourceDocumentId !== invoice.id ||
      !canDeleteAutoGeneratedReceiptOnUnmark(receipt))
  ) {
    return {
      documents,
      preservedReceiptId: receipt.id,
    };
  }

  let nextDocuments = documents.map((doc) =>
    doc.id === invoice.id
      ? {
          ...doc,
          status: nextStatus,
          paymentStatus: paymentStatusAfterUnmark(nextStatus),
          paidAt: undefined,
          receiptDocumentId: undefined,
          updatedAt,
        }
      : doc,
  );

  if (!receipt) {
    return { documents: nextDocuments };
  }

  nextDocuments = nextDocuments.filter((doc) => doc.id !== receipt.id);
  const renumberYear = getDocumentYear(receipt, numbering);

  return {
    documents: renumberDocumentsForKindYear(
      nextDocuments,
      "recibo",
      renumberYear,
      numbering,
    ),
    removedReceiptId: receipt.id,
    renumberYear,
  };
}
