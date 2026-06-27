import {
  buildDocumentSafeSummary,
  documentIntegrityLock,
  documentKind,
  documentLifecycle,
  documentStatus,
  documentsFrom,
  isProtectedDocument,
} from "./helpers";
import type { LocalDataDocumentSafeSummary, LocalDataSafetyAppData, LocalDataSafetyDocumentLike } from "./types";

// PHASE2D58_DOCUMENT_LIFECYCLE_RISK_MATRIX_V1

export type DocumentLifecycleImportRiskClassification = "reviewable" | "manual_review" | "blocked";

export interface DocumentLifecycleRiskEntry {
  document: LocalDataDocumentSafeSummary;
  classification: DocumentLifecycleImportRiskClassification;
  reasons: string[];
  applyAllowed: false;
  restoreAllowed: false;
}

export interface DocumentLifecycleRiskMatrix {
  marker: "PHASE2D58_DOCUMENT_LIFECYCLE_RISK_MATRIX_V1";
  generatedAt: string;
  entries: DocumentLifecycleRiskEntry[];
  totals: Record<DocumentLifecycleImportRiskClassification, number>;
  manualReviewRequired: boolean;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

export interface DocumentLifecycleRiskMatrixSummary {
  totals: DocumentLifecycleRiskMatrix["totals"];
  manualReviewRequired: boolean;
  entryCount: number;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

function classifyBudgetReceipt(document: LocalDataSafetyDocumentLike): string[] {
  const kind = documentKind(document);
  const status = documentStatus(document);
  const reasons: string[] = [];
  if (kind === "budget" && status === "enviado") reasons.push("sent_budget_requires_manual_review");
  if (kind === "budget" && status === "aceptado") reasons.push("accepted_budget_requires_manual_review");
  if (kind === "receipt" && status === "pagado") reasons.push("paid_receipt_is_protected");
  if (kind === "receipt" && status === "emitido") reasons.push("emitted_receipt_is_protected");
  return reasons;
}

export function classifyDocumentLifecycleImportRisk(
  document: LocalDataSafetyDocumentLike,
): DocumentLifecycleRiskEntry {
  const reasons = classifyBudgetReceipt(document);
  const lifecycle = documentLifecycle(document);
  const lock = documentIntegrityLock(document);
  const status = documentStatus(document);

  if (isProtectedDocument(document)) reasons.push("protected_document_requires_review");
  if (!lifecycle) reasons.push("missing_lifecycle_conservative_review");
  if (!lock) reasons.push("missing_integrity_lock_conservative_review");
  if (status && status !== "borrador" && !lifecycle) reasons.push("legacy_non_draft_is_protected");
  if (!status && !lifecycle) reasons.push("unknown_status_conservative_review");

  let classification: DocumentLifecycleImportRiskClassification = "reviewable";
  if (reasons.some((reason) => /protected|receipt|accepted|legacy/i.test(reason))) classification = "blocked";
  else if (reasons.length > 0) classification = "manual_review";

  return {
    document: buildDocumentSafeSummary(document),
    classification,
    reasons,
    applyAllowed: false,
    restoreAllowed: false,
  };
}

export function buildDocumentLifecycleRiskMatrix(
  appData: LocalDataSafetyAppData,
  options: { generatedAt?: string } = {},
): DocumentLifecycleRiskMatrix {
  const entries = documentsFrom(appData).map(classifyDocumentLifecycleImportRisk);
  const totals = entries.reduce<DocumentLifecycleRiskMatrix["totals"]>(
    (current, entry) => ({
      ...current,
      [entry.classification]: current[entry.classification] + 1,
    }),
    { reviewable: 0, manual_review: 0, blocked: 0 },
  );
  return {
    marker: "PHASE2D58_DOCUMENT_LIFECYCLE_RISK_MATRIX_V1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    entries,
    totals,
    manualReviewRequired: totals.manual_review > 0 || totals.blocked > 0,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}

export function summarizeDocumentLifecycleRiskMatrix(
  matrix: DocumentLifecycleRiskMatrix,
): DocumentLifecycleRiskMatrixSummary {
  return {
    totals: { ...matrix.totals },
    manualReviewRequired: matrix.manualReviewRequired,
    entryCount: matrix.entries.length,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}
