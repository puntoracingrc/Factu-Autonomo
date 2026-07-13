import {
  deriveDocumentLifecycle,
  inspectDocumentSnapshotsIntegrity,
} from "../document-integrity";
import {
  businessProfileMissingDocumentLabels,
  hasUsualSpanishTaxIdShape,
} from "../business-profile";
import { roundMoney } from "../calculations";
import { clientAddressToFormFields } from "../customer-address";
import { buildPdfViewModelFromDocumentSnapshot } from "../document-integrity/pdf-source";
import {
  inspectUsableHistoricalDocumentEvidence,
  projectLegacyImportSnapshotOntoDocument,
} from "../document-integrity/legacy-import-attestation";
import { withDocumentRelationshipIntegritySignals } from "../document-integrity/relationships";
import { invoiceClientMissingDocumentLabels } from "../invoice-compliance";
import { originalStatusAfterRectification } from "../rectificativas";
import type {
  BusinessProfile,
  Document,
  DocumentSnapshot,
  DocumentSnapshotIntegrityIssue,
  DocumentType,
} from "../types";

export interface FiscalExportBlockedDocument {
  id: string;
  referenceDate: string;
  referenceNumber: string;
  issues: DocumentSnapshotIntegrityIssue[];
}

export interface FiscalExportDocumentSelection {
  documents: Document[];
  blockedDocuments: FiscalExportBlockedDocument[];
}

interface CanonicalFiscalCandidate {
  stored: Document;
  canonical: Document;
  snapshot: DocumentSnapshot;
}

function isFiscalType(
  type: DocumentType | undefined,
): type is "factura" | "recibo" {
  return type === "factura" || type === "recibo";
}

function normalizedFiscalIdentityText(value: string | undefined): string {
  return value?.replace(/[\s.-]/g, "").toUpperCase() ?? "";
}

function hasValidSnapshotVatRates(snapshot: DocumentSnapshot): boolean {
  return (
    snapshot.items.every(
      (item) =>
        Number.isFinite(item.ivaPercent) &&
        item.ivaPercent >= 0 &&
        item.ivaPercent <= 100,
    ) &&
    snapshot.taxSummary.byRate.every(
      (row) =>
        Number.isFinite(row.ivaPercent) &&
        row.ivaPercent >= 0 &&
        row.ivaPercent <= 100,
    )
  );
}

function hasAllowedFiscalSummarySign(snapshot: DocumentSnapshot): boolean {
  if (snapshot.rectification?.type === "anulacion") return true;
  return (
    roundMoney(snapshot.taxSummary.subtotal) >= 0 &&
    roundMoney(snapshot.taxSummary.iva) >= 0 &&
    roundMoney(snapshot.taxSummary.total) >= 0
  );
}

function hasMinimumFiscalSnapshotCompliance(
  snapshot: DocumentSnapshot,
): boolean {
  const issuerNif = normalizedFiscalIdentityText(snapshot.issuer.nif);
  if (
    businessProfileMissingDocumentLabels(snapshot.issuer).length > 0 ||
    !issuerNif ||
    !hasUsualSpanishTaxIdShape(issuerNif) ||
    !snapshot.items.some((item) => item.description.trim()) ||
    !hasValidSnapshotVatRates(snapshot) ||
    !hasAllowedFiscalSummarySign(snapshot)
  ) {
    return false;
  }

  if (snapshot.documentType !== "factura") return true;

  const address = clientAddressToFormFields(snapshot.customer);
  return (
    invoiceClientMissingDocumentLabels({
      name: snapshot.customer.name,
      nif: snapshot.customer.nif,
      address: address.streetLine,
      postalCode: address.postalCode,
      city: address.city,
    }).length === 0
  );
}

function canonicalFiscalIdentity(candidate: CanonicalFiscalCandidate): string {
  const snapshot = candidate.snapshot;
  const identityKind =
    snapshot.documentKind === "factura_rectificativa"
      ? "factura"
      : snapshot.documentKind;
  return [
    identityKind,
    normalizedFiscalIdentityText(snapshot.issuer.nif),
    snapshot.date.slice(0, 4),
    snapshot.number.trim().toUpperCase(),
  ].join("|");
}

function duplicateCanonicalFiscalIds(
  candidates: Iterable<CanonicalFiscalCandidate>,
): Set<string> {
  const byIdentity = new Map<string, CanonicalFiscalCandidate[]>();
  for (const candidate of candidates) {
    const identity = canonicalFiscalIdentity(candidate);
    const matching = byIdentity.get(identity);
    if (matching) matching.push(candidate);
    else byIdentity.set(identity, [candidate]);
  }

  const duplicateIds = new Set<string>();
  for (const matching of byIdentity.values()) {
    if (matching.length < 2) continue;
    matching.forEach((candidate) => duplicateIds.add(candidate.stored.id));
  }
  return duplicateIds;
}

function hasHistoricalEvidence(doc: Document): boolean {
  return Boolean(
    doc.documentSnapshot ||
    doc.pdfSnapshot ||
    doc.snapshotSeal ||
    doc.snapshotIntegrityRequired ||
    doc.snapshotIntegrity ||
    doc.issuedAt ||
    doc.documentLifecycle === "issued" ||
    doc.documentLifecycle === "canceled" ||
    doc.integrityLock === "locked",
  );
}

function isPotentialFiscalDocument(doc: Document): boolean {
  const declaresFiscalType =
    isFiscalType(doc.type) || isFiscalType(doc.documentSnapshot?.documentType);
  if (declaresFiscalType) {
    return (
      hasHistoricalEvidence(doc) || deriveDocumentLifecycle(doc) !== "draft"
    );
  }

  if (!hasHistoricalEvidence(doc)) return false;

  // Si los dos tipos se han disfrazado como presupuesto, solo la evidencia
  // puede aclarar si era fiscal. Una pareja ausente o corrupta es ambigua y
  // debe bloquearse de forma conservadora, no desaparecer del resumen.
  return (
    doc.snapshotIntegrity?.status === "blocked" ||
    !inspectDocumentSnapshotsIntegrity(doc, {
      requireDocumentSnapshot: true,
    }).ok
  );
}

function blockedReference(
  doc: Document,
  issues: DocumentSnapshotIntegrityIssue[],
): FiscalExportBlockedDocument {
  return {
    id: doc.id,
    referenceDate: doc.documentSnapshot?.date ?? doc.date ?? "No verificable",
    referenceNumber:
      doc.documentSnapshot?.number ?? doc.number ?? "No verificable",
    issues: [...new Set(issues)],
  };
}

function addBlockedDocument(
  blockedById: Map<string, FiscalExportBlockedDocument>,
  doc: Document,
  issues: DocumentSnapshotIntegrityIssue[],
): void {
  const previous = blockedById.get(doc.id);
  blockedById.set(
    doc.id,
    blockedReference(doc, [...(previous?.issues ?? []), ...issues]),
  );
}

function hasOperationalFiscalStatus(doc: Document): boolean {
  return (
    doc.status === "enviado" ||
    doc.status === "pagado" ||
    doc.status === "vencido"
  );
}

function relationshipIssues(
  candidate: CanonicalFiscalCandidate,
  candidatesById: Map<string, CanonicalFiscalCandidate>,
): DocumentSnapshotIntegrityIssue[] {
  const { stored, canonical } = candidate;
  const issues: DocumentSnapshotIntegrityIssue[] = [];

  if (stored.type !== canonical.type) {
    issues.push("document_relationship_invalid");
  }

  if (canonical.type === "recibo") {
    if (
      stored.rectifiedById ||
      stored.status === "rectificada" ||
      stored.status === "anulada" ||
      stored.receiptDocumentId ||
      deriveDocumentLifecycle(stored) !== "issued" ||
      !hasOperationalFiscalStatus(stored)
    ) {
      issues.push("document_relationship_invalid");
    }

    if (stored.sourceDocumentId) {
      const source = candidatesById.get(stored.sourceDocumentId);
      if (
        !source ||
        source.canonical.type !== "factura" ||
        source.stored.receiptDocumentId !== stored.id
      ) {
        issues.push("document_relationship_invalid");
      }
    }

    return [...new Set(issues)];
  }

  if (stored.sourceDocumentId) {
    issues.push("document_relationship_invalid");
  }

  if (canonical.rectification) {
    const original = candidatesById.get(
      canonical.rectification.originalDocumentId,
    );
    const expectedOriginalStatus = originalStatusAfterRectification(
      canonical.rectification.type,
    );
    if (
      stored.rectifiedById ||
      stored.status === "rectificada" ||
      stored.status === "anulada" ||
      !original ||
      original.canonical.type !== "factura" ||
      Boolean(original.canonical.rectification) ||
      original.stored.rectifiedById !== stored.id ||
      original.stored.status !== expectedOriginalStatus ||
      canonical.rectification.originalNumber !== original.canonical.number ||
      canonical.rectification.originalDate !== original.canonical.date ||
      canonical.date < original.canonical.date ||
      !hasOperationalFiscalStatus(stored)
    ) {
      issues.push("document_relationship_invalid");
    }
    return [...new Set(issues)];
  }

  if (stored.rectifiedById) {
    const rectification = candidatesById.get(stored.rectifiedById);
    const relation = rectification?.canonical.rectification;
    if (
      !rectification ||
      rectification.canonical.type !== "factura" ||
      !relation ||
      relation.originalDocumentId !== stored.id ||
      stored.status !== originalStatusAfterRectification(relation.type)
    ) {
      issues.push("document_relationship_invalid");
    }
  } else if (stored.status === "rectificada" || stored.status === "anulada") {
    issues.push("document_relationship_invalid");
  } else if (!hasOperationalFiscalStatus(stored)) {
    issues.push("document_relationship_invalid");
  }

  return [...new Set(issues)];
}

/**
 * Prepara exclusivamente documentos fiscales verificables para una exportación.
 * La fecha, titular, líneas e importes proceden del snapshot canónico, nunca de
 * los campos vivos. Los documentos sin snapshot verificable quedan fuera y se
 * devuelven como incidencias para que la exportación haga visible la exclusión.
 */
export function selectCanonicalFiscalDocumentsForExport(
  documents: Document[],
  profile: BusinessProfile,
  isDateInPeriod: (date: string) => boolean,
): FiscalExportDocumentSelection {
  const selected: Document[] = [];
  const blockedById = new Map<string, FiscalExportBlockedDocument>();
  const candidatesById = new Map<string, CanonicalFiscalCandidate>();

  for (const document of withDocumentRelationshipIntegritySignals(documents)) {
    if (!isPotentialFiscalDocument(document)) continue;

    const evidence = inspectUsableHistoricalDocumentEvidence(document);
    const issues = evidence.ok ? [] : evidence.issues;

    if (!evidence.ok) {
      addBlockedDocument(
        blockedById,
        document,
        issues.length > 0 ? issues : ["document_snapshot_missing"],
      );
      continue;
    }

    const acceptsStoredHistoricalContent =
      evidence.acceptedContentPolicy ===
      "stored_fiscal_content_user_authoritative";
    if (
      !acceptsStoredHistoricalContent &&
      !hasMinimumFiscalSnapshotCompliance(evidence.snapshot)
    ) {
      addBlockedDocument(blockedById, document, [
        "document_snapshot_semantic_invalid",
      ]);
      continue;
    }

    try {
      const canonical = acceptsStoredHistoricalContent
        ? projectLegacyImportSnapshotOntoDocument(document)
        : evidence.kind === "app_issued_pdf_recovered"
          ? document
          : buildPdfViewModelFromDocumentSnapshot(
              document,
              profile,
              evidence.snapshot,
            ).doc;
      if (!isFiscalType(canonical.type) || document.type !== canonical.type) {
        addBlockedDocument(blockedById, document, [
          "document_relationship_invalid",
        ]);
        continue;
      }

      candidatesById.set(document.id, {
        stored: document,
        canonical,
        snapshot: evidence.snapshot,
      });
    } catch {
      addBlockedDocument(blockedById, document, ["document_snapshot_invalid"]);
    }
  }

  const duplicateFiscalIds = duplicateCanonicalFiscalIds(
    candidatesById.values(),
  );

  for (const candidate of candidatesById.values()) {
    const issues = [
      ...relationshipIssues(candidate, candidatesById),
      ...(duplicateFiscalIds.has(candidate.stored.id)
        ? ([
            "document_relationship_invalid",
          ] satisfies DocumentSnapshotIntegrityIssue[])
        : []),
    ];
    if (issues.length > 0) {
      addBlockedDocument(blockedById, candidate.stored, issues);
      continue;
    }

    if (
      candidate.canonical.type === "recibo" &&
      candidate.stored.sourceDocumentId
    ) {
      continue;
    }

    if (isDateInPeriod(candidate.canonical.date)) {
      selected.push({
        ...candidate.canonical,
        // Proyección efímera ya verificada: obliga a los cálculos fiscales a
        // consumir taxSummary, también para snapshots legacy sin sello fuerte.
        // En recovery solo se retira la señal derivada que la colección acaba
        // de revalidar; el documento persistido y toda su evidencia quedan
        // intactos y su fingerprint de dominio no incluye esta señal.
        ...(candidate.stored.appIssuedRecoveryAttestation
          ? { snapshotIntegrity: undefined }
          : {}),
        ...(candidate.stored.legacyImportAttestation
          ? { snapshotIntegrityRequired: undefined }
          : candidate.stored.appIssuedRecoveryAttestation
            ? {}
            : { snapshotIntegrityRequired: true }),
      });
    }
  }

  return { documents: selected, blockedDocuments: [...blockedById.values()] };
}
