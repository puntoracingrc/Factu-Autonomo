import type { ImportRestoreDisabledActionsModel } from "./import-restore-disabled-actions";
import type { LocalDataImportRestoreReviewModel } from "./types";

// PHASE2D21_DISABLED_IMPORT_RESTORE_UI_SHELL_SCOPE_V1

export type LocalDataSafetyUiShellScopeStatus =
  | "disabled"
  | "preview_only"
  | "blocked"
  | "ready_for_future_ui_integration_review";

export interface LocalDataSafetyUiShellScopeInput {
  reviewModel?: LocalDataImportRestoreReviewModel;
  disabledActions?: ImportRestoreDisabledActionsModel;
  routeConnected?: boolean;
  navigationConnected?: boolean;
  appIntegrated?: boolean;
  storageAccessRequested?: boolean;
  realDataRequested?: boolean;
  generatedAt?: string;
}

export interface LocalDataSafetyUiShellScope {
  marker: "PHASE2D21_DISABLED_IMPORT_RESTORE_UI_SHELL_SCOPE_V1";
  status: LocalDataSafetyUiShellScopeStatus;
  generatedAt: string;
  disabledByDefault: true;
  routeConnected: false;
  navigationConnected: false;
  appIntegrated: false;
  storageAccessAllowed: false;
  realDataAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  reasons: string[];
  safe: true;
}

export interface LocalDataSafetyUiShellScopeSummary {
  status: LocalDataSafetyUiShellScopeStatus;
  disabledByDefault: true;
  routeConnected: false;
  navigationConnected: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  reasons: string[];
  safe: true;
}

function blockedByInput(input: LocalDataSafetyUiShellScopeInput): string[] {
  const reasons: string[] = [];
  if (!input.reviewModel) reasons.push("Review model is required before UI shell wiring review.");
  if (input.reviewModel?.actions.allowApplyImport) reasons.push("Import apply flag is not accepted.");
  if (input.reviewModel?.actions.allowApplyRestore) reasons.push("Restore apply flag is not accepted.");
  if (input.disabledActions && (!input.disabledActions.applyImportBlocked || !input.disabledActions.applyRestoreBlocked)) {
    reasons.push("Disabled action model must block import and restore apply.");
  }
  if (input.routeConnected) reasons.push("Route connection is not allowed in this phase.");
  if (input.navigationConnected) reasons.push("Navigation connection is not allowed in this phase.");
  if (input.appIntegrated) reasons.push("App integration is not allowed in this phase.");
  if (input.storageAccessRequested) reasons.push("Storage access is not allowed in this phase.");
  if (input.realDataRequested) reasons.push("Real data is not allowed in this phase.");
  return reasons;
}

export function evaluateLocalDataSafetyUiShellScope(
  input: LocalDataSafetyUiShellScopeInput = {},
): LocalDataSafetyUiShellScope {
  const reasons = blockedByInput(input);
  const hasReview = Boolean(input.reviewModel);
  const status: LocalDataSafetyUiShellScopeStatus =
    reasons.length > 0
      ? hasReview
        ? "blocked"
        : "disabled"
      : input.reviewModel?.decision === "dry_run_ready"
        ? "ready_for_future_ui_integration_review"
        : "preview_only";

  return {
    marker: "PHASE2D21_DISABLED_IMPORT_RESTORE_UI_SHELL_SCOPE_V1",
    status,
    generatedAt: input.generatedAt ?? input.reviewModel?.generatedAt ?? new Date().toISOString(),
    disabledByDefault: true,
    routeConnected: false,
    navigationConnected: false,
    appIntegrated: false,
    storageAccessAllowed: false,
    realDataAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    reasons: reasons.length > 0 ? reasons : ["Shell remains disabled and preview-only until explicit wiring review."],
    safe: true,
  };
}

export function summarizeLocalDataSafetyUiShellScope(
  scope: LocalDataSafetyUiShellScope,
): LocalDataSafetyUiShellScopeSummary {
  return {
    status: scope.status,
    disabledByDefault: true,
    routeConnected: false,
    navigationConnected: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    reasons: [...scope.reasons],
    safe: true,
  };
}
