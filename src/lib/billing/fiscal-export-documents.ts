import {
  deriveDocumentLifecycle,
  inspectDocumentSnapshotsIntegrity,
} from "../document-integrity";
import { buildPdfViewModelFromDocumentSnapshot } from "../document-integrity/pdf-source";
import type {
  BusinessProfile,
  Document,
  DocumentSnapshotIntegrityIssue,
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

function isIssuedFiscalDocument(doc: Document): boolean {
  const declaredTypes = [doc.type, doc.documentSnapshot?.documentType];
  if (
    !declaredTypes.some((type) => type === "factura" || type === "recibo")
  ) {
    return false;
  }
  if (doc.sourceDocumentId && declaredTypes.includes("recibo")) return false;
  return deriveDocumentLifecycle(doc) !== "draft";
}

function belongsToRequestedPeriod(
  doc: Document,
  isDateInPeriod: (date: string) => boolean,
): boolean {
  const dates = [doc.documentSnapshot?.date, doc.date].filter(
    (date): date is string => Boolean(date),
  );
  return dates.length === 0 || dates.some(isDateInPeriod);
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
  const blockedDocuments: FiscalExportBlockedDocument[] = [];

  for (const document of documents) {
    if (!isIssuedFiscalDocument(document)) continue;

    const integrity = inspectDocumentSnapshotsIntegrity(document, {
      requireDocumentSnapshot: true,
    });
    const signaledIssues =
      document.snapshotIntegrity?.status === "blocked"
        ? document.snapshotIntegrity.issues
        : [];
    const issues = [...signaledIssues, ...integrity.issues];

    if (issues.length > 0 || !document.documentSnapshot) {
      if (belongsToRequestedPeriod(document, isDateInPeriod)) {
        blockedDocuments.push(
          blockedReference(
            document,
            issues.length > 0 ? issues : ["document_snapshot_missing"],
          ),
        );
      }
      continue;
    }

    try {
      const canonical = buildPdfViewModelFromDocumentSnapshot(
        document,
        profile,
        document.documentSnapshot,
      ).doc;
      if (isDateInPeriod(canonical.date)) {
        selected.push({
          ...canonical,
          // Proyección efímera ya verificada: obliga a los cálculos fiscales a
          // consumir taxSummary, también para snapshots legacy sin sello fuerte.
          snapshotIntegrityRequired: true,
        });
      }
    } catch {
      if (belongsToRequestedPeriod(document, isDateInPeriod)) {
        blockedDocuments.push(
          blockedReference(document, ["document_snapshot_invalid"]),
        );
      }
    }
  }

  return { documents: selected, blockedDocuments };
}
