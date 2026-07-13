import type {
  Client,
  Document,
  DocumentSnapshot,
  DocumentSnapshotIntegrityIssue,
  RectificationInfo,
} from "@/lib/types";
import { hasUsualSpanishTaxIdShape } from "../business-profile";
import { roundMoney } from "../calculations";
import { deriveDocumentLifecycle } from "./index";
import {
  inspectLegacyImportRelationshipCollection,
  inspectUsableHistoricalDocumentEvidence,
  isVerifiedLegacyImportRepairSnapshotCandidate,
} from "./legacy-import-attestation";
import { inspectDocumentSnapshotsIntegrity } from "./snapshots";

function normalizedIdentityText(value: string | undefined): string {
  return value?.replace(/[\s.-]/g, "").toUpperCase() ?? "";
}

function hasValidIssuerTaxId(value: string | undefined): boolean {
  return (
    Boolean(normalizedIdentityText(value)) && hasUsualSpanishTaxIdShape(value)
  );
}

function normalizedName(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ").toLocaleUpperCase("es") ?? "";
}

function customerIdentityMatches(left: Client, right: Client): boolean {
  const leftNif = normalizedIdentityText(left.nif);
  const rightNif = normalizedIdentityText(right.nif);
  if (leftNif || rightNif) {
    return Boolean(leftNif && rightNif && leftNif === rightNif);
  }
  const fallbackIdentity = (customer: Client) =>
    JSON.stringify({
      customerType: customer.customerType ?? "",
      firstName: normalizedName(customer.firstName),
      lastName: normalizedName(customer.lastName),
      name: normalizedName(customer.name),
      contactName: normalizedName(customer.contactName),
      email: normalizedName(customer.email),
      phone: normalizedName(customer.phone),
      streetType: normalizedName(customer.streetType),
      address: normalizedName(customer.address),
      addressExtra: normalizedName(customer.addressExtra),
      residenceType: customer.residenceType ?? "",
      city: normalizedName(customer.city),
      postalCode: normalizedIdentityText(customer.postalCode),
    });
  return Boolean(
    normalizedName(left.name) &&
    normalizedName(right.name) &&
    fallbackIdentity(left) === fallbackIdentity(right),
  );
}

function hasOperationalFiscalStatus(document: Document): boolean {
  return (
    document.status === "enviado" ||
    document.status === "pagado" ||
    document.status === "vencido"
  );
}

function verifiedSnapshot(
  document: Document,
  documentType: "factura" | "recibo",
): DocumentSnapshot | null {
  const evidence = inspectUsableHistoricalDocumentEvidence(document);
  if (!evidence.ok || evidence.snapshot.documentType !== documentType) {
    return null;
  }
  return evidence.snapshot;
}

function isReceiptClaimDocument(document: Document): boolean {
  return (
    document.type === "recibo" ||
    document.documentSnapshot?.documentType === "recibo"
  );
}

function verifiedRectification(document: Document): RectificationInfo | null {
  const snapshot = verifiedSnapshot(document, "factura");
  if (
    snapshot?.documentKind !== "factura_rectificativa" ||
    !snapshot.rectification
  ) {
    return null;
  }
  return snapshot.rectification;
}

function isIssuedRectification(document: Document): boolean {
  if (!document.rectification && !document.documentSnapshot?.rectification) {
    return false;
  }
  return Boolean(
    document.status !== "borrador" ||
    document.documentLifecycle === "issued" ||
    document.documentLifecycle === "canceled" ||
    document.issuedAt ||
    document.documentSnapshot ||
    document.snapshotIntegrityRequired,
  );
}

function hasVerifiedOriginalEvidence(document: Document): boolean {
  const snapshot = verifiedSnapshot(document, "factura");
  return Boolean(
    snapshot?.documentKind === "factura" && !snapshot.rectification,
  );
}

function monetaryAmountsCancel(left: number, right: number): boolean {
  const difference = left + right;
  return Number.isFinite(difference) && roundMoney(Math.abs(difference)) === 0;
}

function isZeroTaxRateRow(
  row: DocumentSnapshot["taxSummary"]["byRate"][number],
): boolean {
  return (
    roundMoney(Math.abs(row.taxableBase)) === 0 &&
    roundMoney(Math.abs(row.ivaAmount)) === 0 &&
    roundMoney(Math.abs(row.total)) === 0
  );
}

function cancellationTaxSummaryMatches(
  originalSnapshot: DocumentSnapshot,
  cancellationSnapshot: DocumentSnapshot,
): boolean {
  const originalSummary = originalSnapshot.taxSummary;
  const cancellationSummary = cancellationSnapshot.taxSummary;
  if (
    originalSummary.vatExempt !== cancellationSummary.vatExempt ||
    !monetaryAmountsCancel(
      originalSummary.subtotal,
      cancellationSummary.subtotal,
    ) ||
    !monetaryAmountsCancel(originalSummary.iva, cancellationSummary.iva) ||
    !monetaryAmountsCancel(originalSummary.total, cancellationSummary.total)
  ) {
    return false;
  }

  const originalByRate = new Map(
    originalSummary.byRate
      .filter((row) => !isZeroTaxRateRow(row))
      .map((row) => [row.ivaPercent, row]),
  );
  const cancellationByRate = new Map(
    cancellationSummary.byRate
      .filter((row) => !isZeroTaxRateRow(row))
      .map((row) => [row.ivaPercent, row]),
  );
  if (originalByRate.size !== cancellationByRate.size) return false;

  for (const [ivaPercent, originalRow] of originalByRate) {
    const cancellationRow = cancellationByRate.get(ivaPercent);
    if (
      !cancellationRow ||
      !monetaryAmountsCancel(
        originalRow.taxableBase,
        cancellationRow.taxableBase,
      ) ||
      !monetaryAmountsCancel(
        originalRow.ivaAmount,
        cancellationRow.ivaAmount,
      ) ||
      !monetaryAmountsCancel(originalRow.total, cancellationRow.total)
    ) {
      return false;
    }
  }

  return true;
}

function relationshipMatches(
  original: Document,
  rectification: Document,
  relation: RectificationInfo,
): boolean {
  const originalSnapshot = original.documentSnapshot!;
  const rectificationSnapshot = rectification.documentSnapshot!;
  const expectedStatus =
    relation.type === "anulacion" ? "anulada" : "rectificada";
  const expectedOriginalLifecycle =
    relation.type === "anulacion" ? "canceled" : "issued";
  const originalIssuerNif = normalizedIdentityText(originalSnapshot.issuer.nif);
  const rectificationIssuerNif = normalizedIdentityText(
    rectificationSnapshot.issuer.nif,
  );

  return Boolean(
    hasVerifiedOriginalEvidence(original) &&
    hasOperationalFiscalStatus(rectification) &&
    deriveDocumentLifecycle(rectification) === "issued" &&
    deriveDocumentLifecycle(original) === expectedOriginalLifecycle &&
    original.rectifiedById === rectification.id &&
    original.status === expectedStatus &&
    relation.originalDocumentId === original.id &&
    relation.originalNumber === originalSnapshot.number &&
    relation.originalDate === originalSnapshot.date &&
    rectificationSnapshot.date >= originalSnapshot.date &&
    originalIssuerNif &&
    rectificationIssuerNif &&
    hasValidIssuerTaxId(originalSnapshot.issuer.nif) &&
    hasValidIssuerTaxId(rectificationSnapshot.issuer.nif) &&
    rectificationIssuerNif === originalIssuerNif &&
    (relation.type !== "anulacion" ||
      (customerIdentityMatches(
        rectificationSnapshot.customer,
        originalSnapshot.customer,
      ) &&
        cancellationTaxSummaryMatches(
          originalSnapshot,
          rectificationSnapshot,
        ))),
  );
}

function comparableSnapshotLines(snapshot: DocumentSnapshot): string {
  return JSON.stringify(
    snapshot.items.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      unit: item.unit?.trim() ?? "",
      unitPrice: item.unitPrice,
      ivaPercent: item.ivaPercent,
      subtotal: item.subtotal,
      ivaAmount: item.ivaAmount,
      total: item.total,
    })),
  );
}

function receiptRelationshipMatches(
  invoice: Document,
  receipt: Document,
): boolean {
  const invoiceSnapshot = verifiedSnapshot(invoice, "factura");
  const receiptSnapshot = verifiedSnapshot(receipt, "recibo");
  if (
    !invoiceSnapshot ||
    invoiceSnapshot.rectification ||
    !receiptSnapshot ||
    !Object.prototype.hasOwnProperty.call(receiptSnapshot, "sourceDocumentId")
  ) {
    return false;
  }

  const invoiceIssuerNif = normalizedIdentityText(invoiceSnapshot.issuer.nif);
  const receiptIssuerNif = normalizedIdentityText(receiptSnapshot.issuer.nif);
  return Boolean(
    invoiceIssuerNif &&
    receiptIssuerNif &&
    hasValidIssuerTaxId(invoiceSnapshot.issuer.nif) &&
    hasValidIssuerTaxId(receiptSnapshot.issuer.nif) &&
    invoiceIssuerNif === receiptIssuerNif &&
    receiptSnapshot.sourceDocumentId === invoice.id &&
    receipt.sourceDocumentId === invoice.id &&
    invoice.receiptDocumentId === receipt.id &&
    invoice.status === "pagado" &&
    receipt.status === "pagado" &&
    deriveDocumentLifecycle(invoice) === "issued" &&
    deriveDocumentLifecycle(receipt) === "issued" &&
    receipt.paymentStatus === "paid" &&
    Boolean(receipt.paidAt) &&
    receiptSnapshot.date >= invoiceSnapshot.date &&
    customerIdentityMatches(
      invoiceSnapshot.customer,
      receiptSnapshot.customer,
    ) &&
    comparableSnapshotLines(invoiceSnapshot) ===
      comparableSnapshotLines(receiptSnapshot) &&
    invoiceSnapshot.taxSummary.subtotal ===
      receiptSnapshot.taxSummary.subtotal &&
    invoiceSnapshot.taxSummary.iva === receiptSnapshot.taxSummary.iva &&
    invoiceSnapshot.taxSummary.total === receiptSnapshot.taxSummary.total,
  );
}

function clearRelationshipSignal(document: Document): Document {
  if (
    !document.snapshotIntegrity?.issues.includes(
      "document_relationship_invalid",
    )
  ) {
    return document;
  }
  const issues = document.snapshotIntegrity.issues.filter(
    (issue) => issue !== "document_relationship_invalid",
  );
  if (issues.length === 0) {
    const cleared = { ...document };
    delete cleared.snapshotIntegrity;
    return cleared;
  }
  return {
    ...document,
    snapshotIntegrity: { status: "blocked", issues },
  };
}

function blockRelationship(document: Document): Document {
  const issue: DocumentSnapshotIntegrityIssue = "document_relationship_invalid";
  const issues = new Set(document.snapshotIntegrity?.issues ?? []);
  issues.add(issue);
  return {
    ...document,
    snapshotIntegrity: {
      status: "blocked",
      issues: [...issues],
    },
  };
}

function duplicateDocumentIds(documents: Document[]): Set<string> {
  const counts = new Map<string, number>();
  for (const document of documents) {
    counts.set(document.id, (counts.get(document.id) ?? 0) + 1);
  }
  return new Set(
    [...counts].filter(([, count]) => count > 1).map(([id]) => id),
  );
}

function verifiedDocumentIdentity(document: Document): string | null {
  const snapshot = document.documentSnapshot;
  if (
    !snapshot ||
    (snapshot.documentType !== "factura" &&
      snapshot.documentType !== "recibo") ||
    !inspectDocumentSnapshotsIntegrity(document, {
      requireDocumentSnapshot: true,
    }).ok
  ) {
    return null;
  }
  const issuerNif = normalizedIdentityText(snapshot.issuer.nif);
  if (!hasValidIssuerTaxId(snapshot.issuer.nif)) return null;
  const identityType =
    snapshot.documentKind === "factura_rectificativa"
      ? "factura"
      : snapshot.documentKind;
  return [
    identityType,
    issuerNif,
    snapshot.date.slice(0, 4),
    snapshot.number.trim().toUpperCase(),
  ].join("|");
}

function verifiedDocumentNumberIdentity(document: Document): string | null {
  const snapshot = document.documentSnapshot;
  if (
    !snapshot ||
    (snapshot.documentType !== "factura" &&
      snapshot.documentType !== "recibo") ||
    !inspectDocumentSnapshotsIntegrity(document, {
      requireDocumentSnapshot: true,
    }).ok
  ) {
    return null;
  }
  const identityType =
    snapshot.documentKind === "factura_rectificativa"
      ? "factura"
      : snapshot.documentKind;
  return [
    identityType,
    snapshot.date.slice(0, 4),
    snapshot.number.trim().toUpperCase(),
  ].join("|");
}

/**
 * Valida el grafo operativo que no cabe dentro del snapshot individual.
 * Las relaciones solo producen efectos fiscales cuando ambos extremos están
 * sellados, son únicos y la procedencia relevante quedó congelada al emitir.
 */
export function withDocumentRelationshipIntegritySignals(
  inputDocuments: Document[],
): Document[] {
  const documents = inputDocuments.map(clearRelationshipSignal);
  const byId = new Map(documents.map((document) => [document.id, document]));
  const invalidIds = duplicateDocumentIds(documents);
  const legacyRelationshipInspection =
    inspectLegacyImportRelationshipCollection(documents);
  for (const documentId of legacyRelationshipInspection.claimedDocumentIds) {
    if (!legacyRelationshipInspection.validDocumentIds.has(documentId)) {
      invalidIds.add(documentId);
    }
  }
  const isValidLegacyPair = (left: Document, right: Document) =>
    legacyRelationshipInspection.validDocumentIds.has(left.id) &&
    legacyRelationshipInspection.validDocumentIds.has(right.id);
  const issuedByOriginal = new Map<string, Document[]>();
  const identities = new Map<string, Document[]>();
  const numberIdentities = new Map<string, Document[]>();

  for (const document of documents) {
    const snapshot = document.documentSnapshot;
    const historicalEvidence =
      inspectUsableHistoricalDocumentEvidence(document);
    const acceptsStoredHistoricalContent =
      historicalEvidence.ok &&
      historicalEvidence.acceptedContentPolicy ===
        "stored_fiscal_content_user_authoritative";
    const canPreviewVerifiedLegacyImport =
      isVerifiedLegacyImportRepairSnapshotCandidate(document);
    if (
      snapshot &&
      (snapshot.documentType === "factura" ||
        snapshot.documentType === "recibo") &&
      inspectDocumentSnapshotsIntegrity(document, {
        requireDocumentSnapshot: true,
      }).ok &&
      !acceptsStoredHistoricalContent &&
      !canPreviewVerifiedLegacyImport &&
      !hasValidIssuerTaxId(snapshot.issuer.nif)
    ) {
      invalidIds.add(document.id);
    }
    const identity = verifiedDocumentIdentity(document);
    if (identity) {
      const matching = identities.get(identity);
      if (matching) matching.push(document);
      else identities.set(identity, [document]);
    }
    const numberIdentity = verifiedDocumentNumberIdentity(document);
    if (numberIdentity) {
      const matching = numberIdentities.get(numberIdentity);
      if (matching) matching.push(document);
      else numberIdentities.set(numberIdentity, [document]);
    }
    if (!isIssuedRectification(document)) continue;
    const relation = verifiedRectification(document);
    if (!relation) {
      invalidIds.add(document.id);
      continue;
    }
    const related = issuedByOriginal.get(relation.originalDocumentId) ?? [];
    related.push(document);
    issuedByOriginal.set(relation.originalDocumentId, related);
  }

  for (const related of identities.values()) {
    if (related.length > 1) {
      related.forEach((document) => invalidIds.add(document.id));
    }
  }

  // Si el número/año coincide y al menos uno de los documentos no conserva un
  // NIF fuerte, no existe forma inequívoca de demostrar que son dos emisores
  // distintos. Todo el grupo queda bloqueado; cuando todos conservan NIF solo
  // colisionan los subgrupos fuertes idénticos comprobados arriba.
  for (const related of numberIdentities.values()) {
    if (
      related.length > 1 &&
      related.some((document) => !verifiedDocumentIdentity(document))
    ) {
      related.forEach((document) => invalidIds.add(document.id));
    }
  }

  for (const [originalId, rectifications] of issuedByOriginal) {
    const original = byId.get(originalId);
    if (
      !original ||
      invalidIds.has(originalId) ||
      rectifications.length !== 1
    ) {
      rectifications.forEach((document) => invalidIds.add(document.id));
      continue;
    }

    const rectification = rectifications[0];
    const relation = verifiedRectification(rectification)!;
    if (
      !isValidLegacyPair(original, rectification) &&
      !relationshipMatches(original, rectification, relation)
    ) {
      invalidIds.add(rectification.id);
    }
  }

  for (const document of documents) {
    const claimsRectifiedState =
      document.type === "factura" &&
      (document.status === "anulada" ||
        document.status === "rectificada" ||
        deriveDocumentLifecycle(document) === "canceled" ||
        Boolean(document.rectifiedById));
    if (!claimsRectifiedState) continue;
    if (!document.rectifiedById) {
      invalidIds.add(document.id);
      continue;
    }
    const rectification = byId.get(document.rectifiedById);
    const relation = rectification
      ? verifiedRectification(rectification)
      : null;
    if (
      !rectification ||
      invalidIds.has(rectification.id) ||
      !relation ||
      (!isValidLegacyPair(document, rectification) &&
        !relationshipMatches(document, rectification, relation))
    ) {
      invalidIds.add(document.id);
      if (rectification) invalidIds.add(rectification.id);
    }
  }

  const receiptsByInvoice = new Map<string, Document[]>();
  for (const receipt of documents) {
    if (!isReceiptClaimDocument(receipt)) continue;
    const frozenSource = receipt.documentSnapshot?.sourceDocumentId;
    const sourceId = receipt.sourceDocumentId ?? frozenSource;
    if (!sourceId) continue;
    const matching = receiptsByInvoice.get(sourceId);
    if (matching) matching.push(receipt);
    else receiptsByInvoice.set(sourceId, [receipt]);
  }

  for (const [invoiceId, receipts] of receiptsByInvoice) {
    const invoice = byId.get(invoiceId);
    if (!invoice || receipts.length !== 1) {
      receipts.forEach((receipt) => invalidIds.add(receipt.id));
      continue;
    }
    const receipt = receipts[0];
    if (
      invalidIds.has(invoice.id) ||
      invalidIds.has(receipt.id) ||
      (!isValidLegacyPair(invoice, receipt) &&
        !receiptRelationshipMatches(invoice, receipt))
    ) {
      invalidIds.add(receipt.id);
    }
  }

  for (const invoice of documents) {
    if (!invoice.receiptDocumentId) continue;
    const receipt = byId.get(invoice.receiptDocumentId);
    if (
      !receipt ||
      invalidIds.has(receipt.id) ||
      (!isValidLegacyPair(invoice, receipt) &&
        !receiptRelationshipMatches(invoice, receipt))
    ) {
      if (receipt) invalidIds.add(receipt.id);
    }
  }

  if (invalidIds.size === 0) return documents;
  return documents.map((document) =>
    invalidIds.has(document.id) ? blockRelationship(document) : document,
  );
}
