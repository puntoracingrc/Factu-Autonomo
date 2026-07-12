import { todayISO } from "./calculations";
import {
  assertDocumentSnapshotsIntegrity,
  buildDocumentSnapshot,
  deriveDocumentLifecycle,
  inspectDocumentSnapshotsIntegrity,
  issueDocument,
  markDocumentPaid,
  stableStringifySnapshot,
} from "./document-integrity";
import { canPhysicallyDeleteDocument } from "./document-integrity/deletion";
import { profileForHistoricalDerivedDocument } from "./document-integrity/derived-issuance";
import { buildCanonicalDocumentForProtectedEffect } from "./document-integrity/pdf-source";
import { withDocumentRelationshipIntegritySignals } from "./document-integrity/relationships";
import {
  assignNextDocumentNumberByType,
  countersFromDocuments,
  getDocumentYear,
  renumberDocumentsForKindYear,
} from "./documents";
import { captureIssuerSnapshot } from "./issuer-snapshot";
import {
  bumpNumberingAfterAssign,
  configuredLastForKind,
} from "./numbering";
import { validateDocumentEmission } from "./invoice-compliance";
import type {
  AppData,
  BusinessProfile,
  Document,
  DocumentSnapshot,
  NumberingSettings,
} from "./types";

export type ReceiptGenerationBlockedReason =
  | "invoice_not_found"
  | "invoice_not_collected"
  | "invoice_integrity_blocked"
  | "invoice_rectification"
  | "receipt_link_missing"
  | "receipt_link_ambiguous"
  | "source_invalid"
  | "generated_relationship_invalid";

export type ReceiptGenerationInspection =
  | { status: "eligible"; invoice: Document }
  | {
      status: "existing";
      invoice: Document;
      receipt: Document;
      integrityBlocked: boolean;
    }
  | { status: "blocked"; reason: ReceiptGenerationBlockedReason };

export interface ReceiptGenerationPreparationOptions {
  now: string;
  createId: () => string;
}

export type ReceiptGenerationPreparationResult =
  | { status: "ready"; data: AppData; receipt: Document }
  | Extract<ReceiptGenerationInspection, { status: "existing" | "blocked" }>;

export interface BuildReceiptFromInvoiceOptions {
  now?: string;
  createId?: () => string;
}

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
  options: BuildReceiptFromInvoiceOptions = {},
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
  const timestamp = options.now ?? new Date().toISOString();
  const today = options.now ? timestamp.slice(0, 10) : todayISO();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const receiptDate = canonicalInvoice.date > today
    ? canonicalInvoice.date
    : today;

  const receipt = {
    type: "recibo",
    date: receiptDate,
    client: { ...canonicalInvoice.client },
    items: canonicalInvoice.items.map((item) => ({
      ...item,
      id: createId(),
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

  const previewTimestamp = timestamp;
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

function isCollectedInvoice(document: Document): boolean {
  return Boolean(
    document.type === "factura" &&
      !document.integrityQuarantine &&
      document.snapshotIntegrity?.status !== "blocked" &&
      document.status === "pagado" &&
      !document.rectifiedById &&
      deriveDocumentLifecycle(document) === "issued"
  );
}

function receiptIntegrityBlocked(
  documents: Document[],
  receipt: Document,
  verifyRelationships: boolean,
): boolean {
  const checked = verifyRelationships
    ? withDocumentRelationshipIntegritySignals(documents).find(
        (document) => document === receipt || document.id === receipt.id,
      )
    : receipt;
  return Boolean(
    receipt.integrityQuarantine ||
      checked?.snapshotIntegrity?.status === "blocked" ||
      !inspectDocumentSnapshotsIntegrity(receipt, {
        requireDocumentSnapshot: true,
        requirePdfSnapshot: true,
        requireSnapshotSeal: true,
      }).ok
  );
}

function inspectReceiptGenerationInternal(
  documents: Document[],
  invoiceId: string,
  verifyRelationships: boolean,
): ReceiptGenerationInspection {
  const matches = documents.filter((document) => document.id === invoiceId);
  if (matches.length === 0) {
    return { status: "blocked", reason: "invoice_not_found" };
  }
  if (matches.length !== 1) {
    return { status: "blocked", reason: "source_invalid" };
  }
  if (matches[0].type !== "factura") {
    return { status: "blocked", reason: "invoice_not_found" };
  }

  const invoice = matches[0];
  const claims = receiptClaimsForInvoice(
    documents,
    invoice.id,
    invoice.receiptDocumentId,
  );
  if (claims.length > 1) {
    return { status: "blocked", reason: "receipt_link_ambiguous" };
  }
  if (
    invoice.receiptDocumentId &&
    (claims.length !== 1 || claims[0].id !== invoice.receiptDocumentId)
  ) {
    return { status: "blocked", reason: "receipt_link_missing" };
  }
  if (claims.length === 1) {
    return {
      status: "existing",
      invoice,
      receipt: claims[0],
      integrityBlocked: receiptIntegrityBlocked(
        documents,
        claims[0],
        verifyRelationships,
      ),
    };
  }

  const checkedInvoice = verifyRelationships
    ? withDocumentRelationshipIntegritySignals(documents).find(
        (document) => document.id === invoice.id,
      )
    : invoice;
  const snapshotIntegrity = inspectDocumentSnapshotsIntegrity(invoice, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });
  if (
    invoice.integrityQuarantine ||
    invoice.snapshotIntegrity?.status === "blocked" ||
    checkedInvoice?.snapshotIntegrity?.status === "blocked" ||
    !snapshotIntegrity.ok
  ) {
    return { status: "blocked", reason: "invoice_integrity_blocked" };
  }
  if (
    invoice.rectification ||
    invoice.documentSnapshot?.rectification ||
    invoice.rectifiedById
  ) {
    return { status: "blocked", reason: "invoice_rectification" };
  }
  if (!checkedInvoice || !isCollectedInvoice(checkedInvoice)) {
    return { status: "blocked", reason: "invoice_not_collected" };
  }

  return { status: "eligible", invoice };
}

/** Inspección de dominio completa. No usar para renderizar cada tarjeta. */
export function inspectReceiptGeneration(
  documents: Document[],
  invoiceId: string,
): ReceiptGenerationInspection {
  return inspectReceiptGenerationInternal(documents, invoiceId, true);
}

/**
 * Proyección exclusiva de UI sobre señales ya normalizadas. Nunca autoriza
 * una creación: `prepareReceiptGeneration` repite siempre la validación
 * completa antes de construir el candidato.
 */
export function inspectReceiptGenerationForDisplay(
  documents: Document[],
  invoiceId: string,
): ReceiptGenerationInspection {
  return inspectReceiptGenerationInternal(documents, invoiceId, false);
}

export function prepareReceiptGeneration(
  data: AppData,
  invoiceId: string,
  options: ReceiptGenerationPreparationOptions,
): ReceiptGenerationPreparationResult {
  const inspection = inspectReceiptGeneration(data.documents, invoiceId);
  if (inspection.status !== "eligible") return inspection;

  const invoice = inspection.invoice;
  try {
    const canonicalInvoice = buildCanonicalDocumentForProtectedEffect(
      invoice,
      data.profile,
    );
    if (
      canonicalInvoice.documentSnapshot?.documentType !== "factura" ||
      canonicalInvoice.rectification ||
      canonicalInvoice.documentSnapshot?.rectification
    ) {
      return { status: "blocked", reason: "source_invalid" };
    }
    const receiptProfile = profileForHistoricalDerivedDocument(
      canonicalInvoice.documentSnapshot,
      data.profile,
    );
    const receiptId = options.createId();
    if (
      !receiptId.trim() ||
      data.documents.some((document) => document.id === receiptId)
    ) {
      return { status: "blocked", reason: "source_invalid" };
    }
    const receiptDraft = buildReceiptFromInvoice(
      canonicalInvoice,
      receiptProfile,
      { now: options.now, createId: options.createId },
    );
    const itemIds = receiptDraft.items.map((item) => item.id);
    if (
      itemIds.some((id) => !id.trim()) ||
      new Set(itemIds).size !== itemIds.length
    ) {
      return { status: "blocked", reason: "source_invalid" };
    }
    const year = new Date(receiptDraft.date).getFullYear();
    const numbering = data.profile.numbering;
    const { number, sequence } = assignNextDocumentNumberByType(
      data.documents,
      "recibo",
      year,
      configuredLastForKind(numbering, "recibo", year),
      numbering,
    );
    const receipt = markDocumentPaid(
      issueDocument(
        {
          ...receiptDraft,
          status: "borrador",
          id: receiptId,
          number,
          issuer: captureIssuerSnapshot(receiptProfile, options.now),
          createdAt: options.now,
          updatedAt: options.now,
        },
        receiptProfile,
        options.now,
      ),
      options.now,
    );
    const documents = [
      ...data.documents.map((document) =>
        document.id === invoice.id
          ? {
              ...document,
              receiptDocumentId: receipt.id,
              updatedAt: options.now,
            }
          : document,
      ),
      receipt,
    ];
    const relationshipChecked = withDocumentRelationshipIntegritySignals(documents);
    const checkedInvoice = relationshipChecked.find(
      (document) => document.id === invoice.id,
    );
    const checkedReceipt = relationshipChecked.find(
      (document) => document.id === receipt.id,
    );
    if (
      checkedInvoice?.snapshotIntegrity?.status === "blocked" ||
      checkedReceipt?.snapshotIntegrity?.status === "blocked" ||
      !checkedInvoice ||
      !checkedReceipt
    ) {
      return { status: "blocked", reason: "generated_relationship_invalid" };
    }

    return {
      status: "ready",
      receipt,
      data: {
        ...data,
        profile: {
          ...data.profile,
          numbering: bumpNumberingAfterAssign(
            numbering,
            "recibo",
            year,
            sequence,
          ),
        },
        documents,
        counters: countersFromDocuments(documents, year, numbering),
      },
    };
  } catch {
    return { status: "blocked", reason: "source_invalid" };
  }
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
