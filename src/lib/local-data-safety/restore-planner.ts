import {
  buildDocumentSafeSummary,
  documentRef,
  documentRiskFlags,
  documentsFrom,
  equivalentSafeDocument,
  indexDocumentsByRef,
  isProtectedDocument,
  nowIso,
  uniqueRiskFlags,
} from "./helpers";
import { validatePreImportRecoverySnapshot } from "./recovery-snapshot";
import type {
  LocalDataRecoverySnapshot,
  LocalDataRestoreAction,
  LocalDataRestoreDecision,
  LocalDataRestorePlan,
  LocalDataRestorePlannerOptions,
  LocalDataRestorePlanSummary,
  LocalDataRiskFlag,
  LocalDataSafetyAppData,
  LocalDataSafetyDocumentLike,
} from "./types";

// PHASE2D6_RESTORE_PLANNER_DOCUMENT_PROTECTION_V1

function decideRestore(
  current: LocalDataSafetyDocumentLike | undefined,
  snapshotDocument: LocalDataSafetyDocumentLike,
  options: Required<Pick<LocalDataRestorePlannerOptions, "allowDraftRestores">>,
): LocalDataRestoreDecision {
  const snapshotProtected = isProtectedDocument(snapshotDocument);
  const currentProtected = current ? isProtectedDocument(current) : false;
  const riskFlags: LocalDataRiskFlag[] = [...documentRiskFlags(snapshotDocument)];
  let action: LocalDataRestoreAction;

  if (!current && !snapshotProtected && options.allowDraftRestores) {
    action = "restore_missing_draft";
  } else if (!current && snapshotProtected) {
    action = "manual_review";
    riskFlags.push("restore_snapshot_missing");
  } else if (current && equivalentSafeDocument(current, snapshotDocument)) {
    action = "keep_current";
  } else if (currentProtected) {
    action = "blocked_protected";
    riskFlags.push("restore_would_change_protected");
  } else if (snapshotProtected) {
    action = "manual_review";
  } else if (options.allowDraftRestores) {
    action = "restore_changed_draft";
  } else {
    action = "manual_review";
  }

  return {
    documentRef: documentRef(snapshotDocument),
    action,
    currentProtected,
    snapshotProtected,
    riskFlags: uniqueRiskFlags(riskFlags),
    safeSummary: buildDocumentSafeSummary(snapshotDocument),
  };
}

function emptyTotals(
  currentDocuments: number,
  snapshotDocuments: number,
): LocalDataRestorePlan["totals"] {
  return {
    currentDocuments,
    snapshotDocuments,
    draftRestores: 0,
    kept: 0,
    manualReview: 0,
    blockedProtected: 0,
  };
}

function countRestoreAction(
  totals: LocalDataRestorePlan["totals"],
  action: LocalDataRestoreAction,
): void {
  if (action === "restore_missing_draft" || action === "restore_changed_draft") {
    totals.draftRestores += 1;
  }
  if (action === "keep_current") totals.kept += 1;
  if (action === "manual_review") totals.manualReview += 1;
  if (action === "blocked_protected") totals.blockedProtected += 1;
}

export function planLocalDataRestore(
  currentData: LocalDataSafetyAppData,
  recoverySnapshot: LocalDataRecoverySnapshot,
  options: LocalDataRestorePlannerOptions = {},
): LocalDataRestorePlan {
  const snapshot = validatePreImportRecoverySnapshot(recoverySnapshot);
  const currentDocuments = documentsFrom(currentData);
  const snapshotDocuments = documentsFrom(snapshot.appData);
  const currentByRef = indexDocumentsByRef(currentDocuments);
  const allowDraftRestores = options.allowDraftRestores ?? true;
  const decisions = snapshotDocuments.map((snapshotDocument) =>
    decideRestore(currentByRef.get(documentRef(snapshotDocument)), snapshotDocument, {
      allowDraftRestores,
    }),
  );
  const totals = emptyTotals(currentDocuments.length, snapshotDocuments.length);
  for (const decision of decisions) countRestoreAction(totals, decision.action);

  for (const current of currentDocuments) {
    if (isProtectedDocument(current) && !snapshotDocuments.some((item) => documentRef(item) === documentRef(current))) {
      decisions.push({
        documentRef: documentRef(current),
        action: "blocked_protected",
        currentProtected: true,
        snapshotProtected: false,
        riskFlags: ["restore_would_remove_protected"],
        safeSummary: buildDocumentSafeSummary(current),
      });
      totals.blockedProtected += 1;
    }
  }

  return {
    marker: "PHASE2D6_RESTORE_PLANNER_DOCUMENT_PROTECTION_V1",
    dryRun: true,
    plannedAt: options.plannedAt ?? nowIso(),
    snapshotCreatedAt: snapshot.createdAt,
    totals,
    riskFlags: uniqueRiskFlags(decisions.flatMap((decision) => decision.riskFlags)),
    decisions,
  };
}

export function summarizeLocalDataRestorePlan(
  plan: LocalDataRestorePlan,
): LocalDataRestorePlanSummary {
  return {
    dryRun: true,
    plannedAt: plan.plannedAt,
    snapshotCreatedAt: plan.snapshotCreatedAt,
    totals: { ...plan.totals },
    riskFlags: [...plan.riskFlags],
  };
}
