import {
  evaluateHiddenImportRestoreUiShellFlag,
  type HiddenImportRestoreUiShellFlag,
} from "./hidden-ui-shell-flag";
import {
  evaluateImportRestoreNoGoConditions,
  summarizeImportRestoreNoGoConditions,
  type ImportRestoreNoGoConditionInput,
  type ImportRestoreNoGoConditionId,
} from "./import-restore-no-go-conditions";

// PHASE2D93_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_GATE_V1

export type HiddenImportRestoreUiEnablementGateStatus =
  | "blocked_by_default"
  | "ready_for_ux_review"
  | "ready_for_owner_approval"
  | "ready_for_future_hidden_enablement"
  | "rejected";

export interface HiddenUiEnablementApprovalInputs {
  uxReviewApproved?: boolean;
  legalReviewApproved?: boolean;
  dataLossReviewApproved?: boolean;
  ownerApproved?: boolean;
}

export interface HiddenImportRestoreUiEnablementGateInput extends ImportRestoreNoGoConditionInput {
  generatedAt?: string;
  shellFlag?: HiddenImportRestoreUiShellFlag;
  noRouteAcceptancePassed?: boolean;
  noStorageAcceptancePassed?: boolean;
  uxLegalDataLossPacketPrepared?: boolean;
  ownerDecisionPacketPrepared?: boolean;
  approvals?: HiddenUiEnablementApprovalInputs;
  noGoConditionsCleared?: boolean;
}

export interface HiddenImportRestoreUiEnablementBlocker {
  id:
    | "blocked_by_default"
    | "hidden_shell_flag_missing"
    | "hidden_shell_not_routeless"
    | "no_route_acceptance_missing"
    | "no_storage_acceptance_missing"
    | "ux_legal_data_loss_packet_missing"
    | "owner_decision_packet_missing"
    | "ux_review_missing"
    | "legal_review_missing"
    | "data_loss_review_missing"
    | "owner_approval_missing"
    | "no_go_conditions_uncleared"
    | ImportRestoreNoGoConditionId;
  severity: "blocker";
  rejected: boolean;
}

export interface HiddenImportRestoreUiEnablementGate {
  marker: "PHASE2D93_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_GATE_V1";
  generatedAt: string;
  status: HiddenImportRestoreUiEnablementGateStatus;
  blockers: HiddenImportRestoreUiEnablementBlocker[];
  noGoSummary: ReturnType<typeof summarizeImportRestoreNoGoConditions>;
  hiddenShellStatus: HiddenImportRestoreUiShellFlag["status"];
  routeAllowed: false;
  navigationAllowed: false;
  storageReadAllowed: false;
  storageWriteAllowed: false;
  fileReaderAllowed: false;
  downloadAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  enablementAllowed: false;
  safe: true;
}

export interface HiddenImportRestoreUiEnablementGateSummary {
  status: HiddenImportRestoreUiEnablementGateStatus;
  blockerIds: HiddenImportRestoreUiEnablementBlocker["id"][];
  hiddenShellStatus: HiddenImportRestoreUiShellFlag["status"];
  enablementAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

function blocker(
  id: HiddenImportRestoreUiEnablementBlocker["id"],
  rejected = false,
): HiddenImportRestoreUiEnablementBlocker {
  return { id, severity: "blocker", rejected };
}

export function buildHiddenImportRestoreUiEnablementBlockers(
  input: HiddenImportRestoreUiEnablementGateInput = {},
): HiddenImportRestoreUiEnablementBlocker[] {
  const blockers: HiddenImportRestoreUiEnablementBlocker[] = [];
  const shellFlag = input.shellFlag;
  const approvals = input.approvals ?? {};
  const noGo = evaluateImportRestoreNoGoConditions(input);

  if (!shellFlag) blockers.push(blocker("hidden_shell_flag_missing"));
  if (shellFlag && shellFlag.mode !== "routeless_preview_only") blockers.push(blocker("hidden_shell_not_routeless"));
  if (!input.noRouteAcceptancePassed) blockers.push(blocker("no_route_acceptance_missing"));
  if (!input.noStorageAcceptancePassed) blockers.push(blocker("no_storage_acceptance_missing"));
  if (!input.uxLegalDataLossPacketPrepared) blockers.push(blocker("ux_legal_data_loss_packet_missing"));
  if (!input.ownerDecisionPacketPrepared) blockers.push(blocker("owner_decision_packet_missing"));
  if (!approvals.uxReviewApproved) blockers.push(blocker("ux_review_missing"));
  if (!approvals.legalReviewApproved) blockers.push(blocker("legal_review_missing"));
  if (!approvals.dataLossReviewApproved) blockers.push(blocker("data_loss_review_missing"));
  if (!approvals.ownerApproved) blockers.push(blocker("owner_approval_missing"));
  if (!input.noGoConditionsCleared) blockers.push(blocker("no_go_conditions_uncleared"));
  for (const id of noGo.activeConditionIds) blockers.push(blocker(id, true));
  if (blockers.length === 0 && !input.shellFlag) blockers.push(blocker("blocked_by_default"));

  return blockers;
}

function statusFor(blockers: HiddenImportRestoreUiEnablementBlocker[]): HiddenImportRestoreUiEnablementGateStatus {
  if (blockers.some((entry) => entry.rejected)) return "rejected";
  if (blockers.length === 0) return "ready_for_future_hidden_enablement";
  if (blockers.every((entry) => entry.id === "owner_approval_missing" || entry.id === "owner_decision_packet_missing")) {
    return "ready_for_owner_approval";
  }
  if (blockers.every((entry) => String(entry.id).includes("review") || String(entry.id).includes("owner"))) {
    return "ready_for_ux_review";
  }
  return "blocked_by_default";
}

export function evaluateHiddenImportRestoreUiEnablementGate(
  input: HiddenImportRestoreUiEnablementGateInput = {},
): HiddenImportRestoreUiEnablementGate {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const shellFlag = input.shellFlag ?? evaluateHiddenImportRestoreUiShellFlag({ generatedAt });
  const blockers = buildHiddenImportRestoreUiEnablementBlockers({ ...input, shellFlag, generatedAt });
  const noGo = evaluateImportRestoreNoGoConditions({ ...input, generatedAt });

  return {
    marker: "PHASE2D93_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_GATE_V1",
    generatedAt,
    status: statusFor(blockers),
    blockers,
    noGoSummary: summarizeImportRestoreNoGoConditions(noGo),
    hiddenShellStatus: shellFlag.status,
    routeAllowed: false,
    navigationAllowed: false,
    storageReadAllowed: false,
    storageWriteAllowed: false,
    fileReaderAllowed: false,
    downloadAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    enablementAllowed: false,
    safe: true,
  };
}

export function summarizeHiddenImportRestoreUiEnablementGate(
  gate: HiddenImportRestoreUiEnablementGate,
): HiddenImportRestoreUiEnablementGateSummary {
  return {
    status: gate.status,
    blockerIds: gate.blockers.map((entry) => entry.id),
    hiddenShellStatus: gate.hiddenShellStatus,
    enablementAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
