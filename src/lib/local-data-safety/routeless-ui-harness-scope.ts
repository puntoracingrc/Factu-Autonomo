// PHASE2D45_ROUTELESS_IMPORT_RESTORE_UI_HARNESS_SCOPE_V1

export type RoutelessImportRestoreUiHarnessScopeStatus =
  | "blocked_by_default"
  | "preview_harness_ready"
  | "ready_for_ux_review"
  | "rejected";

export interface RoutelessImportRestoreUiHarnessScopeInput {
  syntheticFixturesOnly?: boolean;
  viewModelProvided?: boolean;
  disabledActionsProvided?: boolean;
  stateMachineProvided?: boolean;
  reviewSessionProvided?: boolean;
  dataLossWarningsProvided?: boolean;
  uxLegalReviewPacketPrepared?: boolean;
  routeConnected?: boolean;
  navigationConnected?: boolean;
  filePickerConnected?: boolean;
  browserStorageReadConnected?: boolean;
  browserStorageWriteConnected?: boolean;
  importApplyConnected?: boolean;
  restoreApplyConnected?: boolean;
  realDataUsed?: boolean;
  generatedAt?: string;
}

export interface RoutelessImportRestoreUiHarnessScope {
  marker: "PHASE2D45_ROUTELESS_IMPORT_RESTORE_UI_HARNESS_SCOPE_V1";
  status: RoutelessImportRestoreUiHarnessScopeStatus;
  generatedAt: string;
  syntheticFixturesOnly: boolean;
  routeAllowed: false;
  navigationAllowed: false;
  filePickerAllowed: false;
  browserStorageReadAllowed: false;
  browserStorageWriteAllowed: false;
  importApplyAllowed: false;
  restoreApplyAllowed: false;
  realDataAllowed: false;
  blockers: string[];
  requiredApprovals: {
    uxReview: false;
    legalReview: false;
    dataLossReview: false;
    storageReview: false;
    productOwner: false;
  };
  safe: true;
}

export interface RoutelessImportRestoreUiHarnessScopeSummary {
  status: RoutelessImportRestoreUiHarnessScopeStatus;
  syntheticFixturesOnly: boolean;
  blockers: string[];
  routeAllowed: false;
  navigationAllowed: false;
  importApplyAllowed: false;
  restoreApplyAllowed: false;
  safe: true;
}

function forbiddenIntegrationBlockers(input: RoutelessImportRestoreUiHarnessScopeInput): string[] {
  const blockers: string[] = [];
  if (input.routeConnected) blockers.push("Route connection is not allowed in the routeless preview harness.");
  if (input.navigationConnected) blockers.push("Navigation connection is not allowed in the routeless preview harness.");
  if (input.filePickerConnected) blockers.push("Real file picker connection is not allowed.");
  if (input.browserStorageReadConnected) blockers.push("Browser storage reads are not allowed.");
  if (input.browserStorageWriteConnected) blockers.push("Browser storage writes are not allowed.");
  if (input.importApplyConnected) blockers.push("Import apply is not allowed.");
  if (input.restoreApplyConnected) blockers.push("Restore apply is not allowed.");
  if (input.realDataUsed) blockers.push("Real customer or invoice data is not allowed.");
  return blockers;
}

export function buildRoutelessImportRestoreUiHarnessBlockers(
  input: RoutelessImportRestoreUiHarnessScopeInput = {},
): string[] {
  const blockers = forbiddenIntegrationBlockers(input);
  if (!input.syntheticFixturesOnly) blockers.push("Synthetic-only fixtures are required.");
  if (!input.viewModelProvided) blockers.push("A safe view model is required.");
  if (!input.disabledActionsProvided) blockers.push("Disabled actions are required.");
  if (!input.stateMachineProvided) blockers.push("Preview flow state machine is required.");
  if (!input.reviewSessionProvided) blockers.push("Review session model is required.");
  if (!input.dataLossWarningsProvided) blockers.push("Data-loss warning model is required.");
  if (
    input.syntheticFixturesOnly &&
    input.viewModelProvided &&
    input.disabledActionsProvided &&
    input.stateMachineProvided &&
    input.reviewSessionProvided &&
    input.dataLossWarningsProvided &&
    !input.uxLegalReviewPacketPrepared
  ) {
    blockers.push("UX/legal review packet is required before review.");
  }
  return blockers;
}

function statusFor(
  input: RoutelessImportRestoreUiHarnessScopeInput,
  blockers: string[],
): RoutelessImportRestoreUiHarnessScopeStatus {
  if (forbiddenIntegrationBlockers(input).length > 0) return "rejected";
  const coreReady =
    input.syntheticFixturesOnly &&
    input.viewModelProvided &&
    input.disabledActionsProvided &&
    input.stateMachineProvided &&
    input.reviewSessionProvided &&
    input.dataLossWarningsProvided;
  if (coreReady && input.uxLegalReviewPacketPrepared && blockers.length === 0) return "ready_for_ux_review";
  if (coreReady) return "preview_harness_ready";
  return "blocked_by_default";
}

export function evaluateRoutelessImportRestoreUiHarnessScope(
  input: RoutelessImportRestoreUiHarnessScopeInput = {},
): RoutelessImportRestoreUiHarnessScope {
  const blockers = buildRoutelessImportRestoreUiHarnessBlockers(input);
  return {
    marker: "PHASE2D45_ROUTELESS_IMPORT_RESTORE_UI_HARNESS_SCOPE_V1",
    status: statusFor(input, blockers),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    syntheticFixturesOnly: input.syntheticFixturesOnly === true,
    routeAllowed: false,
    navigationAllowed: false,
    filePickerAllowed: false,
    browserStorageReadAllowed: false,
    browserStorageWriteAllowed: false,
    importApplyAllowed: false,
    restoreApplyAllowed: false,
    realDataAllowed: false,
    blockers,
    requiredApprovals: {
      uxReview: false,
      legalReview: false,
      dataLossReview: false,
      storageReview: false,
      productOwner: false,
    },
    safe: true,
  };
}

export function summarizeRoutelessImportRestoreUiHarnessScope(
  scope: RoutelessImportRestoreUiHarnessScope,
): RoutelessImportRestoreUiHarnessScopeSummary {
  return {
    status: scope.status,
    syntheticFixturesOnly: scope.syntheticFixturesOnly,
    blockers: [...scope.blockers],
    routeAllowed: false,
    navigationAllowed: false,
    importApplyAllowed: false,
    restoreApplyAllowed: false,
    safe: true,
  };
}
