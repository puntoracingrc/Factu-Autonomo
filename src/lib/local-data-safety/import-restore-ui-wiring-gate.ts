import type { ImportRestoreDisabledActionsModel } from "./import-restore-disabled-actions";
import type { LocalDataSafetyUiShellScope } from "./ui-shell-scope";
import type {
  DisabledLocalDataStorageAdapter,
  LocalDataImportRestoreReviewModel,
  LocalDataStorageAdapterReadiness,
} from "./types";

// PHASE2D33_IMPORT_RESTORE_UI_WIRING_READINESS_GATE_V1

export type ImportRestoreUiWiringReadinessStatus =
  | "blocked_by_default"
  | "ready_for_review"
  | "ready_for_explicit_wiring_decision"
  | "rejected";

export interface ImportRestoreUiWiringReadinessInput {
  reviewModel?: LocalDataImportRestoreReviewModel;
  scope?: LocalDataSafetyUiShellScope;
  disabledActions?: ImportRestoreDisabledActionsModel;
  storageAdapter?: DisabledLocalDataStorageAdapter;
  storageReadiness?: LocalDataStorageAdapterReadiness;
  checklistPrepared?: boolean;
  routeConnected?: boolean;
  navigationConnected?: boolean;
  filePickerConnected?: boolean;
  generatedAt?: string;
}

export interface ImportRestoreUiWiringReadiness {
  marker: "PHASE2D33_IMPORT_RESTORE_UI_WIRING_READINESS_GATE_V1";
  status: ImportRestoreUiWiringReadinessStatus;
  generatedAt: string;
  canWireUi: false;
  routeAllowed: false;
  navigationAllowed: false;
  filePickerAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  blockers: string[];
  safe: true;
}

export interface ImportRestoreUiWiringReadinessSummary {
  status: ImportRestoreUiWiringReadinessStatus;
  canWireUi: false;
  blockers: string[];
  safe: true;
}

function storageReadinessFor(
  input: ImportRestoreUiWiringReadinessInput,
): LocalDataStorageAdapterReadiness | undefined {
  return input.storageReadiness ?? input.storageAdapter?.summarize();
}

export function buildImportRestoreUiWiringBlockers(
  input: ImportRestoreUiWiringReadinessInput = {},
): string[] {
  const blockers: string[] = [];
  const storage = storageReadinessFor(input);

  if (!input.reviewModel) blockers.push("Review model is required before wiring review.");
  if (input.reviewModel?.actions.allowApplyImport) blockers.push("Import apply is not allowed.");
  if (input.reviewModel?.actions.allowApplyRestore) blockers.push("Restore apply is not allowed.");
  if (!input.scope) blockers.push("Disabled UI shell scope is required.");
  if (input.scope && (input.scope.applyImportAllowed || input.scope.applyRestoreAllowed)) {
    blockers.push("UI shell scope must keep apply blocked.");
  }
  if (!input.disabledActions) blockers.push("Disabled action model is required.");
  if (input.disabledActions && (!input.disabledActions.applyImportBlocked || !input.disabledActions.applyRestoreBlocked)) {
    blockers.push("Disabled action model must block import and restore apply.");
  }
  if (!input.checklistPrepared) blockers.push("Explicit wiring approval checklist must be prepared.");
  if (!storage) blockers.push("Disabled browser storage adapter readiness is required.");
  if (storage && (storage.canRead || storage.canWrite)) blockers.push("Browser storage adapter must remain disabled.");
  if (input.routeConnected) blockers.push("Route connection is not allowed.");
  if (input.navigationConnected) blockers.push("Navigation connection is not allowed.");
  if (input.filePickerConnected) blockers.push("Real file picker connection is not allowed.");

  return blockers;
}

function statusFor(input: ImportRestoreUiWiringReadinessInput, blockers: string[]): ImportRestoreUiWiringReadinessStatus {
  const rejected = blockers.some((blocker) =>
    /not allowed|must remain disabled|must keep apply|must block/i.test(blocker),
  );
  if (rejected) return "rejected";
  if (blockers.length === 0) return "ready_for_explicit_wiring_decision";
  if (input.reviewModel || input.scope || input.disabledActions) return "ready_for_review";
  return "blocked_by_default";
}

export function evaluateImportRestoreUiWiringReadiness(
  input: ImportRestoreUiWiringReadinessInput = {},
): ImportRestoreUiWiringReadiness {
  const blockers = buildImportRestoreUiWiringBlockers(input);
  return {
    marker: "PHASE2D33_IMPORT_RESTORE_UI_WIRING_READINESS_GATE_V1",
    status: statusFor(input, blockers),
    generatedAt: input.generatedAt ?? input.reviewModel?.generatedAt ?? new Date().toISOString(),
    canWireUi: false,
    routeAllowed: false,
    navigationAllowed: false,
    filePickerAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    blockers: blockers.length > 0 ? blockers : ["Ready for explicit routeless UI wiring decision; no activation granted."],
    safe: true,
  };
}

export function summarizeImportRestoreUiWiringReadiness(
  readiness: ImportRestoreUiWiringReadiness,
): ImportRestoreUiWiringReadinessSummary {
  return {
    status: readiness.status,
    canWireUi: false,
    blockers: [...readiness.blockers],
    safe: true,
  };
}
