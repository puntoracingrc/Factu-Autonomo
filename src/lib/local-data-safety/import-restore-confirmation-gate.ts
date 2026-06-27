import type {
  LocalDataBackupValidationPipelineResult,
  LocalDataImportRestoreConfirmationApprovals,
  LocalDataImportRestoreConfirmationChecklist,
  LocalDataImportRestoreConfirmationResult,
  LocalDataImportRestoreConfirmationSummary,
  LocalDataImportRestoreReviewModel,
} from "./types";

// PHASE2D14_IMPORT_RESTORE_HUMAN_CONFIRMATION_GATE_V1

function defaultApprovals(): Required<LocalDataImportRestoreConfirmationApprovals> {
  return {
    backupReviewed: false,
    protectedDocumentsReviewed: false,
    numberingRisksReviewed: false,
    snapshotRisksReviewed: false,
    dryRunReportReviewed: false,
    externalReviewAccepted: false,
  };
}

function resolveApprovals(
  approvals: LocalDataImportRestoreConfirmationApprovals = {},
): Required<LocalDataImportRestoreConfirmationApprovals> {
  return {
    ...defaultApprovals(),
    ...approvals,
  };
}

function reasonsFor(
  validationResult: LocalDataBackupValidationPipelineResult,
  reviewModel: LocalDataImportRestoreReviewModel,
): string[] {
  const reasons = ["Import and restore apply are disabled in this phase."];
  if (reviewModel.protectedDocumentsCount > 0) {
    reasons.push("Protected document references require manual review.");
  }
  if (validationResult.importPlan?.totals.rejectedProtected) {
    reasons.push("Protected overwrite decisions require manual review.");
  }
  if (validationResult.importPlan?.totals.manualReview) {
    reasons.push("Snapshot or content differences require manual review.");
  }
  if (validationResult.riskFlags.includes("incoming_counter_change")) {
    reasons.push("Numbering or counter differences require manual review.");
  }
  if (validationResult.status === "invalid") {
    reasons.push("Validation errors must be resolved before any future apply design.");
  }
  return reasons;
}

export function buildLocalDataImportRestoreConfirmationChecklist(): LocalDataImportRestoreConfirmationChecklist {
  return {
    marker: "PHASE2D14_IMPORT_RESTORE_HUMAN_CONFIRMATION_GATE_V1",
    backupReviewed: false,
    protectedDocumentsReviewed: false,
    numberingRisksReviewed: false,
    snapshotRisksReviewed: false,
    dryRunReportReviewed: false,
    externalReviewAccepted: false,
  };
}

export function evaluateLocalDataImportRestoreHumanConfirmation(
  validationResult: LocalDataBackupValidationPipelineResult,
  reviewModel: LocalDataImportRestoreReviewModel,
  approvals: LocalDataImportRestoreConfirmationApprovals = {},
  evaluatedAt = reviewModel.generatedAt,
): LocalDataImportRestoreConfirmationResult {
  const resolvedApprovals = resolveApprovals(approvals);
  return {
    marker: "PHASE2D14_IMPORT_RESTORE_HUMAN_CONFIRMATION_GATE_V1",
    evaluatedAt,
    requiresHumanConfirmation: reviewModel.actions.requiresHumanConfirmation,
    manualReviewRequired: reviewModel.manualReviewRequired,
    approvals: resolvedApprovals,
    canProceedToApply: false,
    reasons: reasonsFor(validationResult, reviewModel),
  };
}

export function summarizeLocalDataImportRestoreConfirmation(
  confirmation: LocalDataImportRestoreConfirmationResult,
): LocalDataImportRestoreConfirmationSummary {
  return {
    evaluatedAt: confirmation.evaluatedAt,
    requiresHumanConfirmation: confirmation.requiresHumanConfirmation,
    manualReviewRequired: confirmation.manualReviewRequired,
    canProceedToApply: false,
    reasons: [...confirmation.reasons],
  };
}
