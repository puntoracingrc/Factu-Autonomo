import { uniqueRiskFlags } from "./helpers";
import type {
  LocalDataBackupValidationPipelineResult,
  LocalDataImportRestoreReviewModel,
  LocalDataImportRestoreReviewModelSummary,
  LocalDataReviewSection,
  LocalDataReviewSeverity,
  LocalDataRiskFlag,
} from "./types";

// PHASE2D13_IMPORT_RESTORE_REVIEW_MODEL_V1

function severityFor(result: LocalDataBackupValidationPipelineResult): LocalDataReviewSeverity {
  if (result.status === "invalid") return "blocked";
  if (
    result.importPlan?.totals.rejectedProtected ||
    result.importPlan?.totals.manualReview ||
    result.riskFlags.includes("incoming_counter_change")
  ) {
    return "warning";
  }
  return "info";
}

function manualReviewRequired(result: LocalDataBackupValidationPipelineResult): boolean {
  return (
    result.status === "invalid" ||
    Boolean(result.importPlan?.totals.rejectedProtected) ||
    Boolean(result.importPlan?.totals.manualReview) ||
    result.riskFlags.includes("incoming_counter_change")
  );
}

function countProtected(result: LocalDataBackupValidationPipelineResult): number {
  return result.manifest?.totals.protectedDocuments ?? 0;
}

function section(
  id: LocalDataReviewSection["id"],
  title: string,
  severity: LocalDataReviewSeverity,
  count: number,
  messages: string[],
): LocalDataReviewSection {
  return { id, title, severity, count, messages };
}

function modelRiskFlags(result: LocalDataBackupValidationPipelineResult): LocalDataRiskFlag[] {
  const flags: LocalDataRiskFlag[] = [...result.riskFlags];
  if (manualReviewRequired(result)) flags.push("review_manual_confirmation_required");
  return uniqueRiskFlags(flags);
}

export function buildLocalDataImportRestoreReviewModel(
  validationResult: LocalDataBackupValidationPipelineResult,
): LocalDataImportRestoreReviewModel {
  const severity = severityFor(validationResult);
  const requiresReview = manualReviewRequired(validationResult);
  const protectedDocumentsCount = countProtected(validationResult);
  const rejectedProtected = validationResult.importPlan?.totals.rejectedProtected ?? 0;
  const manualReview = validationResult.importPlan?.totals.manualReview ?? 0;
  const blockers = validationResult.errors.length + rejectedProtected;

  return {
    marker: "PHASE2D13_IMPORT_RESTORE_REVIEW_MODEL_V1",
    generatedAt: validationResult.validatedAt,
    status: validationResult.status === "valid" ? "ready_for_review" : "blocked",
    severity,
    decision:
      validationResult.status === "invalid"
        ? "blocked_until_review"
        : requiresReview
          ? "manual_review_required"
          : "dry_run_ready",
    manualReviewRequired: requiresReview,
    protectedDocumentsCount,
    sections: [
      section("overview", "Overview", severity, validationResult.errors.length, [
        validationResult.status === "valid"
          ? "Backup validation completed as dry-run."
          : "Backup validation stopped before review could be completed.",
      ]),
      section("backup_summary", "Backup summary", protectedDocumentsCount > 0 ? "warning" : "info", protectedDocumentsCount, [
        `${protectedDocumentsCount} protected document references detected in backup summary.`,
      ]),
      section("import_risks", "Import risks", rejectedProtected > 0 || manualReview > 0 ? "warning" : "info", rejectedProtected + manualReview, [
        `${rejectedProtected} protected overwrite decisions and ${manualReview} manual review decisions.`,
      ]),
      section("restore_risks", "Restore risks", requiresReview ? "warning" : "info", protectedDocumentsCount, [
        "Restore remains preview-only until a later reviewed flow is explicitly approved.",
      ]),
      section("blockers", "Blockers", blockers > 0 ? "blocked" : "info", blockers, [
        "Import and restore apply actions are disabled in this phase.",
      ]),
    ],
    actions: {
      allowDryRunOnly: true,
      allowApplyImport: false,
      allowApplyRestore: false,
      requiresHumanConfirmation: requiresReview,
    },
    riskFlags: modelRiskFlags(validationResult),
  };
}

export function summarizeLocalDataImportRestoreReviewModel(
  model: LocalDataImportRestoreReviewModel,
): LocalDataImportRestoreReviewModelSummary {
  return {
    status: model.status,
    severity: model.severity,
    decision: model.decision,
    manualReviewRequired: model.manualReviewRequired,
    protectedDocumentsCount: model.protectedDocumentsCount,
    actions: { ...model.actions },
    riskFlags: [...model.riskFlags],
  };
}
