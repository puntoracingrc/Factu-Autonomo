import { buildDocumentSafeSummary, documentsFrom, isProtectedDocument } from "./helpers";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D62_LEGACY_BACKUP_COMPATIBILITY_CLASSIFIER_V1

export type LegacyBackupCompatibilityIssueId =
  | "missing_document_lifecycle"
  | "missing_integrity_lock"
  | "missing_document_snapshot"
  | "missing_pdf_snapshot"
  | "old_payment_status"
  | "old_counters"
  | "unknown_entity_fields"
  | "partial_app_data"
  | "legacy_protected_non_draft";

export interface LegacyBackupCompatibilityIssue {
  id: LegacyBackupCompatibilityIssueId;
  severity: "info" | "warning" | "blocked";
  ref: string;
  message: string;
}

export interface LegacyBackupCompatibilityClassification {
  marker: "PHASE2D62_LEGACY_BACKUP_COMPATIBILITY_CLASSIFIER_V1";
  generatedAt: string;
  status: "compatible" | "manual_review_required" | "blocked";
  issues: LegacyBackupCompatibilityIssue[];
  documentSummaries: ReturnType<typeof buildDocumentSafeSummary>[];
  migrationAllowed: false;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

export interface LegacyBackupCompatibilitySummary {
  status: LegacyBackupCompatibilityClassification["status"];
  issueIds: LegacyBackupCompatibilityIssueId[];
  issueCount: number;
  migrationAllowed: false;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

function addIssue(
  issues: LegacyBackupCompatibilityIssue[],
  id: LegacyBackupCompatibilityIssueId,
  severity: LegacyBackupCompatibilityIssue["severity"],
  ref: string,
  message: string,
): void {
  issues.push({ id, severity, ref, message });
}

export function classifyLegacyBackupCompatibility(
  appData: LocalDataSafetyAppData,
  options: { generatedAt?: string } = {},
): LegacyBackupCompatibilityClassification {
  const issues: LegacyBackupCompatibilityIssue[] = [];
  if (!Array.isArray(appData.documents)) addIssue(issues, "partial_app_data", "warning", "documents", "Documents array is missing.");
  if (!Array.isArray(appData.customers) && !Array.isArray(appData.clients)) {
    addIssue(issues, "partial_app_data", "warning", "customers", "Customer array is missing.");
  }
  if (appData.counters && typeof appData.counters !== "object") addIssue(issues, "old_counters", "warning", "counters", "Counters shape is legacy.");

  for (const document of documentsFrom(appData)) {
    const summary = buildDocumentSafeSummary(document);
    if (!document.documentLifecycle) addIssue(issues, "missing_document_lifecycle", "warning", summary.documentRef, "Missing lifecycle.");
    if (!document.integrityLock) addIssue(issues, "missing_integrity_lock", "warning", summary.documentRef, "Missing integrity lock.");
    if (isProtectedDocument(document) && !document.snapshotHash) {
      addIssue(issues, "missing_document_snapshot", "warning", summary.documentRef, "Protected document lacks snapshot reference.");
    }
    if (isProtectedDocument(document) && !document.pdfSnapshotHash) {
      addIssue(issues, "missing_pdf_snapshot", "warning", summary.documentRef, "Protected document lacks PDF hash reference.");
    }
    if (document.paymentStatus) addIssue(issues, "old_payment_status", "info", summary.documentRef, "Legacy payment status present.");
    if (document.status && document.status !== "borrador" && !document.documentLifecycle) {
      addIssue(issues, "legacy_protected_non_draft", "blocked", summary.documentRef, "Legacy non-draft document is protected.");
    }
    if (Object.keys(document).some((key) => key.startsWith("legacy") || key.startsWith("unknown"))) {
      addIssue(issues, "unknown_entity_fields", "info", summary.documentRef, "Unknown legacy fields present but not echoed.");
    }
  }

  const status = issues.some((issue) => issue.severity === "blocked")
    ? "blocked"
    : issues.length > 0
      ? "manual_review_required"
      : "compatible";
  return {
    marker: "PHASE2D62_LEGACY_BACKUP_COMPATIBILITY_CLASSIFIER_V1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    status,
    issues,
    documentSummaries: documentsFrom(appData).map(buildDocumentSafeSummary),
    migrationAllowed: false,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}

export function summarizeLegacyBackupCompatibility(
  classification: LegacyBackupCompatibilityClassification,
): LegacyBackupCompatibilitySummary {
  return {
    status: classification.status,
    issueIds: [...new Set(classification.issues.map((issue) => issue.id))],
    issueCount: classification.issues.length,
    migrationAllowed: false,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}
