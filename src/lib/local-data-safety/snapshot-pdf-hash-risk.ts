import { buildDocumentSafeSummary, documentRef, documentsFrom, indexDocumentsByRef, isProtectedDocument } from "./helpers";
import type { LocalDataDocumentSafeSummary, LocalDataSafetyAppData, LocalDataSafetyDocumentLike } from "./types";

// PHASE2D60_SNAPSHOT_PDF_HASH_RISK_ANALYZER_V1

export type SnapshotPdfHashRiskId =
  | "snapshot_hash_mismatch"
  | "pdf_snapshot_hash_mismatch"
  | "snapshot_missing_on_protected"
  | "pdf_hash_missing_on_protected"
  | "incoming_replaces_frozen_hash"
  | "legacy_fallback_required";

export interface SnapshotPdfHashRisk {
  id: SnapshotPdfHashRiskId;
  severity: "info" | "warning" | "blocked";
  document: LocalDataDocumentSafeSummary;
  message: string;
}

export interface SnapshotPdfHashRiskAssessment {
  marker: "PHASE2D60_SNAPSHOT_PDF_HASH_RISK_ANALYZER_V1";
  generatedAt: string;
  risks: SnapshotPdfHashRisk[];
  manualReviewRequired: boolean;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

export interface SnapshotPdfHashRiskSummary {
  riskIds: SnapshotPdfHashRiskId[];
  highestSeverity: "info" | "warning" | "blocked";
  manualReviewRequired: boolean;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

function addRisk(
  risks: SnapshotPdfHashRisk[],
  id: SnapshotPdfHashRiskId,
  severity: SnapshotPdfHashRisk["severity"],
  document: LocalDataSafetyDocumentLike,
  message: string,
): void {
  risks.push({ id, severity, document: buildDocumentSafeSummary(document), message });
}

export function compareDocumentSnapshotReferences(
  current: LocalDataSafetyDocumentLike | undefined,
  incoming: LocalDataSafetyDocumentLike,
): SnapshotPdfHashRisk[] {
  const risks: SnapshotPdfHashRisk[] = [];
  const protectedIncoming = isProtectedDocument(incoming);
  const protectedCurrent = current ? isProtectedDocument(current) : false;
  const protectedRef = protectedIncoming || protectedCurrent;

  if (current?.snapshotHash && incoming.snapshotHash && current.snapshotHash !== incoming.snapshotHash) {
    addRisk(risks, "snapshot_hash_mismatch", protectedRef ? "blocked" : "warning", incoming, "Snapshot hash differs.");
  }
  if (current?.pdfSnapshotHash && incoming.pdfSnapshotHash && current.pdfSnapshotHash !== incoming.pdfSnapshotHash) {
    addRisk(risks, "pdf_snapshot_hash_mismatch", protectedRef ? "blocked" : "warning", incoming, "PDF hash differs.");
  }
  if (protectedIncoming && !incoming.snapshotHash) {
    addRisk(risks, "snapshot_missing_on_protected", "warning", incoming, "Protected incoming document lacks snapshot hash.");
  }
  if (protectedIncoming && !incoming.pdfSnapshotHash) {
    addRisk(risks, "pdf_hash_missing_on_protected", "warning", incoming, "Protected incoming document lacks PDF hash.");
  }
  if (
    protectedCurrent &&
    ((current?.snapshotHash && incoming.snapshotHash && current.snapshotHash !== incoming.snapshotHash) ||
      (current?.pdfSnapshotHash && incoming.pdfSnapshotHash && current.pdfSnapshotHash !== incoming.pdfSnapshotHash))
  ) {
    addRisk(risks, "incoming_replaces_frozen_hash", "blocked", incoming, "Incoming backup attempts to replace frozen hash.");
  }
  if (protectedRef && (!current?.snapshotHash || !incoming.snapshotHash || !current?.pdfSnapshotHash || !incoming.pdfSnapshotHash)) {
    addRisk(risks, "legacy_fallback_required", "warning", incoming, "Legacy fallback review required.");
  }

  return risks;
}

export function analyzeSnapshotPdfHashRisk(
  currentData: LocalDataSafetyAppData,
  incomingData: LocalDataSafetyAppData,
  options: { generatedAt?: string } = {},
): SnapshotPdfHashRiskAssessment {
  const currentByRef = indexDocumentsByRef(documentsFrom(currentData));
  const risks = documentsFrom(incomingData).flatMap((incoming) =>
    compareDocumentSnapshotReferences(currentByRef.get(documentRef(incoming)), incoming),
  );
  return {
    marker: "PHASE2D60_SNAPSHOT_PDF_HASH_RISK_ANALYZER_V1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    risks,
    manualReviewRequired: risks.length > 0,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}

function highestSeverity(risks: SnapshotPdfHashRisk[]): "info" | "warning" | "blocked" {
  if (risks.some((risk) => risk.severity === "blocked")) return "blocked";
  if (risks.some((risk) => risk.severity === "warning")) return "warning";
  return "info";
}

export function summarizeSnapshotPdfHashRisk(
  assessment: SnapshotPdfHashRiskAssessment,
): SnapshotPdfHashRiskSummary {
  return {
    riskIds: [...new Set(assessment.risks.map((risk) => risk.id))],
    highestSeverity: highestSeverity(assessment.risks),
    manualReviewRequired: assessment.manualReviewRequired,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}
