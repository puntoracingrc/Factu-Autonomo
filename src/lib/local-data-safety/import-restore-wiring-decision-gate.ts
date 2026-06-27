import type {
  ImportRestoreUiWiringReadiness,
  ImportRestoreUiWiringReadinessStatus,
} from "./import-restore-ui-wiring-gate";

// PHASE2D69_IMPORT_RESTORE_WIRING_DECISION_GATE_V1

export type ImportRestoreWiringDecisionGateStatus =
  | "blocked_by_default"
  | "ready_for_ux_review"
  | "ready_for_legal_review"
  | "ready_for_owner_decision"
  | "rejected";

export interface ImportRestoreWiringDecisionGateInput {
  corpusRegressionPassed?: boolean;
  uiWiringGatePassed?: boolean;
  uiWiringReadiness?: Pick<ImportRestoreUiWiringReadiness, "status" | "canWireUi" | "applyImportAllowed" | "applyRestoreAllowed">;
  uxDataLossPacketPrepared?: boolean;
  legalReviewPacketPrepared?: boolean;
  approvalTemplatePrepared?: boolean;
  approvalsAllFalse?: boolean;
  storageAdapterDisabled?: boolean;
  filePickerDisabled?: boolean;
  routeConnected?: boolean;
  navigationConnected?: boolean;
  applyImportAllowed?: boolean;
  applyRestoreAllowed?: boolean;
  generatedAt?: string;
}

export interface ImportRestoreWiringDecisionGate {
  marker: "PHASE2D69_IMPORT_RESTORE_WIRING_DECISION_GATE_V1";
  status: ImportRestoreWiringDecisionGateStatus;
  generatedAt: string;
  blockers: string[];
  requiredReviews: {
    corpusRegression: boolean;
    uxReview: boolean;
    legalReview: boolean;
    ownerDecision: boolean;
  };
  uiWiringReadinessStatus?: ImportRestoreUiWiringReadinessStatus;
  canWireUi: false;
  routeAllowed: false;
  navigationAllowed: false;
  filePickerAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

export interface ImportRestoreWiringDecisionGateSummary {
  status: ImportRestoreWiringDecisionGateStatus;
  blockers: string[];
  canWireUi: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

function uiGatePassed(input: ImportRestoreWiringDecisionGateInput): boolean {
  return (
    input.uiWiringGatePassed === true ||
    input.uiWiringReadiness?.status === "ready_for_explicit_wiring_decision"
  );
}

function hasForbiddenActivation(input: ImportRestoreWiringDecisionGateInput): boolean {
  return Boolean(
    input.routeConnected ||
      input.navigationConnected ||
      input.applyImportAllowed ||
      input.applyRestoreAllowed ||
      input.storageAdapterDisabled === false ||
      input.filePickerDisabled === false ||
      input.uiWiringReadiness?.canWireUi ||
      input.uiWiringReadiness?.applyImportAllowed ||
      input.uiWiringReadiness?.applyRestoreAllowed,
  );
}

export function buildImportRestoreWiringDecisionBlockers(
  input: ImportRestoreWiringDecisionGateInput = {},
): string[] {
  const blockers: string[] = [];
  if (!input.corpusRegressionPassed) blockers.push("Corpus regression acceptance must pass before a wiring decision.");
  if (!uiGatePassed(input)) blockers.push("Disabled UI wiring gate must be ready for explicit decision.");
  if (!input.uxDataLossPacketPrepared) blockers.push("UX/data-loss decision packet is required.");
  if (!input.legalReviewPacketPrepared) blockers.push("Legal review packet is required.");
  if (!input.approvalTemplatePrepared) blockers.push("Approval template must be prepared.");
  if (!input.approvalsAllFalse) blockers.push("Approval state must start with all approvals false.");
  if (input.storageAdapterDisabled !== true) blockers.push("Browser storage adapter must remain disabled.");
  if (input.filePickerDisabled !== true) blockers.push("Real file picker must remain disabled.");
  if (input.routeConnected) blockers.push("Route connection is rejected.");
  if (input.navigationConnected) blockers.push("Navigation connection is rejected.");
  if (input.applyImportAllowed || input.uiWiringReadiness?.applyImportAllowed) blockers.push("Import apply is rejected.");
  if (input.applyRestoreAllowed || input.uiWiringReadiness?.applyRestoreAllowed) blockers.push("Restore apply is rejected.");
  if (input.uiWiringReadiness?.canWireUi) blockers.push("UI wiring must not be enabled by this decision gate.");
  return blockers;
}

function statusFor(
  input: ImportRestoreWiringDecisionGateInput,
  blockers: string[],
): ImportRestoreWiringDecisionGateStatus {
  if (hasForbiddenActivation(input)) return "rejected";
  if (!input.corpusRegressionPassed || !uiGatePassed(input)) return "blocked_by_default";
  if (!input.uxDataLossPacketPrepared) return "ready_for_ux_review";
  if (!input.legalReviewPacketPrepared) return "ready_for_legal_review";
  if (blockers.length === 0) return "ready_for_owner_decision";
  return "blocked_by_default";
}

export function evaluateImportRestoreWiringDecisionGate(
  input: ImportRestoreWiringDecisionGateInput = {},
): ImportRestoreWiringDecisionGate {
  const blockers = buildImportRestoreWiringDecisionBlockers(input);
  const gate: ImportRestoreWiringDecisionGate = {
    marker: "PHASE2D69_IMPORT_RESTORE_WIRING_DECISION_GATE_V1",
    status: statusFor(input, blockers),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    blockers,
    requiredReviews: {
      corpusRegression: input.corpusRegressionPassed !== true,
      uxReview: input.uxDataLossPacketPrepared !== true,
      legalReview: input.legalReviewPacketPrepared !== true,
      ownerDecision: blockers.length > 0,
    },
    canWireUi: false,
    routeAllowed: false,
    navigationAllowed: false,
    filePickerAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
  if (input.uiWiringReadiness) gate.uiWiringReadinessStatus = input.uiWiringReadiness.status;
  return gate;
}

export function summarizeImportRestoreWiringDecisionGate(
  gate: ImportRestoreWiringDecisionGate,
): ImportRestoreWiringDecisionGateSummary {
  return {
    status: gate.status,
    blockers: [...gate.blockers],
    canWireUi: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
