import {
  buildDocumentSafeSummary,
  documentRiskFlags,
  documentRef,
  documentsFrom,
  equivalentSafeDocument,
  indexDocumentsByRef,
  isProtectedDocument,
  nowIso,
  uniqueRiskFlags,
} from "./helpers";
import type {
  LocalDataImportDryRunAction,
  LocalDataImportDryRunDocumentDecision,
  LocalDataImportDryRunOptions,
  LocalDataImportDryRunPlan,
  LocalDataImportDryRunSummary,
  LocalDataRiskFlag,
  LocalDataSafetyAppData,
  LocalDataSafetyDocumentLike,
} from "./types";

// PHASE2D4_IMPORT_DRY_RUN_PLANNER_V1

function hasHashMismatch(
  current: LocalDataSafetyDocumentLike,
  incoming: LocalDataSafetyDocumentLike,
  key: "snapshotHash" | "pdfSnapshotHash",
): boolean {
  return Boolean(current[key] && incoming[key] && current[key] !== incoming[key]);
}

function decideDocumentImport(
  current: LocalDataSafetyDocumentLike | undefined,
  incoming: LocalDataSafetyDocumentLike,
  options: Required<Pick<LocalDataImportDryRunOptions, "allowDraftUpdates">>,
): LocalDataImportDryRunDocumentDecision {
  const incomingProtected = isProtectedDocument(incoming);
  const currentProtected = current ? isProtectedDocument(current) : false;
  const riskFlags: LocalDataRiskFlag[] = [...documentRiskFlags(incoming)];
  let action: LocalDataImportDryRunAction;

  if (!current) {
    action = "add_document";
    riskFlags.push("incoming_would_add_document");
  } else if (equivalentSafeDocument(current, incoming)) {
    action = "keep_current";
  } else if (currentProtected) {
    action = "reject_protected";
    riskFlags.push("incoming_would_overwrite_protected");
  } else if (
    hasHashMismatch(current, incoming, "snapshotHash") ||
    hasHashMismatch(current, incoming, "pdfSnapshotHash")
  ) {
    action = "manual_review";
    if (hasHashMismatch(current, incoming, "snapshotHash")) {
      riskFlags.push("incoming_snapshot_hash_mismatch");
    }
    if (hasHashMismatch(current, incoming, "pdfSnapshotHash")) {
      riskFlags.push("incoming_pdf_snapshot_hash_mismatch");
    }
  } else if (options.allowDraftUpdates && !incomingProtected) {
    action = "update_draft";
    riskFlags.push("incoming_would_update_draft");
  } else {
    action = "manual_review";
  }

  return {
    documentRef: documentRef(incoming),
    action,
    currentProtected,
    incomingProtected,
    riskFlags: uniqueRiskFlags(riskFlags),
    safeSummary: buildDocumentSafeSummary(incoming),
  };
}

function emptyTotals(
  incomingDocuments: number,
  currentDocuments: number,
): LocalDataImportDryRunPlan["totals"] {
  return {
    incomingDocuments,
    currentDocuments,
    additions: 0,
    draftUpdates: 0,
    kept: 0,
    manualReview: 0,
    rejectedProtected: 0,
  };
}

function countAction(
  totals: LocalDataImportDryRunPlan["totals"],
  action: LocalDataImportDryRunAction,
): void {
  if (action === "add_document") totals.additions += 1;
  if (action === "update_draft") totals.draftUpdates += 1;
  if (action === "keep_current") totals.kept += 1;
  if (action === "manual_review") totals.manualReview += 1;
  if (action === "reject_protected") totals.rejectedProtected += 1;
}

export function planLocalDataImportDryRun(
  currentData: LocalDataSafetyAppData,
  incomingData: LocalDataSafetyAppData,
  options: LocalDataImportDryRunOptions = {},
): LocalDataImportDryRunPlan {
  const currentDocuments = documentsFrom(currentData);
  const incomingDocuments = documentsFrom(incomingData);
  const currentByRef = indexDocumentsByRef(currentDocuments);
  const allowDraftUpdates = options.allowDraftUpdates ?? true;
  const decisions = incomingDocuments.map((incoming) =>
    decideDocumentImport(currentByRef.get(documentRef(incoming)), incoming, {
      allowDraftUpdates,
    }),
  );
  const totals = emptyTotals(incomingDocuments.length, currentDocuments.length);
  for (const decision of decisions) countAction(totals, decision.action);

  const riskFlags = uniqueRiskFlags(decisions.flatMap((decision) => decision.riskFlags));
  if (
    JSON.stringify(currentData.counters ?? {}) !== JSON.stringify(incomingData.counters ?? {}) ||
    JSON.stringify(currentData.numbering ?? {}) !== JSON.stringify(incomingData.numbering ?? {})
  ) {
    riskFlags.push("incoming_counter_change");
  }

  return {
    marker: "PHASE2D4_IMPORT_DRY_RUN_PLANNER_V1",
    dryRun: true,
    plannedAt: options.plannedAt ?? nowIso(),
    totals,
    riskFlags: uniqueRiskFlags(riskFlags),
    decisions,
  };
}

export function summarizeLocalDataImportDryRun(
  plan: LocalDataImportDryRunPlan,
): LocalDataImportDryRunSummary {
  return {
    dryRun: true,
    plannedAt: plan.plannedAt,
    totals: { ...plan.totals },
    riskFlags: [...plan.riskFlags],
  };
}
