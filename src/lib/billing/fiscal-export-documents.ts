import {
  deriveDocumentLifecycle,
  inspectDocumentSnapshotsIntegrity,
} from "../document-integrity";
import { buildPdfViewModelFromDocumentSnapshot } from "../document-integrity/pdf-source";
import { originalStatusAfterRectification } from "../rectificativas";
import type {
  BusinessProfile,
  Document,
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
}

function isFiscalType(
  type: DocumentType | undefined,
): type is "factura" | "recibo" {
  return type === "factura" || type === "recibo";
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
    isFiscalType(doc.type) ||
    isFiscalType(doc.documentSnapshot?.documentType);
  if (declaresFiscalType) {
    return hasHistoricalEvidence(doc) || deriveDocumentLifecycle(doc) !== "draft";
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
    blockedReference(doc, [
      ...(previous?.issues ?? []),
      ...issues,
    ]),
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

  if (stored.receiptDocumentId) {
    const receipt = candidatesById.get(stored.receiptDocumentId);
    if (
      !receipt ||
      receipt.canonical.type !== "recibo" ||
      receipt.stored.sourceDocumentId !== stored.id
    ) {
      issues.push("document_relationship_invalid");
    }
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

  for (const document of documents) {
    if (!isPotentialFiscalDocument(document)) continue;

    const integrity = inspectDocumentSnapshotsIntegrity(document, {
      requireDocumentSnapshot: true,
    });
    const signaledIssues =
      document.snapshotIntegrity?.status === "blocked"
        ? document.snapshotIntegrity.issues
        : [];
    const issues = [...signaledIssues, ...integrity.issues];

    if (issues.length > 0 || !document.documentSnapshot) {
      addBlockedDocument(
        blockedById,
        document,
        issues.length > 0 ? issues : ["document_snapshot_missing"],
      );
      continue;
    }

    try {
      const canonical = buildPdfViewModelFromDocumentSnapshot(
        document,
        profile,
        document.documentSnapshot,
      ).doc;
      if (!isFiscalType(canonical.type) || document.type !== canonical.type) {
        addBlockedDocument(
          blockedById,
          document,
          ["document_relationship_invalid"],
        );
        continue;
      }

      candidatesById.set(document.id, { stored: document, canonical });
    } catch {
      addBlockedDocument(
        blockedById,
        document,
        ["document_snapshot_invalid"],
      );
    }
  }

  for (const candidate of candidatesById.values()) {
    const issues = relationshipIssues(candidate, candidatesById);
    if (issues.length > 0) {
      addBlockedDocument(
        blockedById,
        candidate.stored,
        issues,
      );
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
        snapshotIntegrityRequired: true,
      });
    }
  }

  return { documents: selected, blockedDocuments: [...blockedById.values()] };
}
