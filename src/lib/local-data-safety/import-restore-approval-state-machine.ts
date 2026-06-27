// PHASE2D74_IMPORT_RESTORE_APPROVAL_STATE_MACHINE_V1

export type ImportRestoreApprovalStateName =
  | "approvals_not_started"
  | "ux_review_pending"
  | "legal_review_pending"
  | "data_loss_review_pending"
  | "owner_decision_pending"
  | "approved_for_future_wiring"
  | "rejected";

export type ImportRestoreApprovalEvent =
  | "start_review"
  | "ux_approved"
  | "legal_approved"
  | "data_loss_approved"
  | "owner_approved"
  | "reject"
  | "reset";

export interface ImportRestoreApprovalState {
  marker: "PHASE2D74_IMPORT_RESTORE_APPROVAL_STATE_MACHINE_V1";
  state: ImportRestoreApprovalStateName;
  generatedAt: string;
  approvals: {
    uxApproved: boolean;
    legalApproved: boolean;
    dataLossApproved: boolean;
    ownerApproved: boolean;
  };
  history: ImportRestoreApprovalEvent[];
  canWireFutureUi: boolean;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  routeAllowed: false;
  safe: true;
}

export interface ImportRestoreApprovalStateSummary {
  state: ImportRestoreApprovalStateName;
  approvals: ImportRestoreApprovalState["approvals"];
  canWireFutureUi: boolean;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

export function createImportRestoreApprovalState(
  generatedAt = new Date().toISOString(),
): ImportRestoreApprovalState {
  return {
    marker: "PHASE2D74_IMPORT_RESTORE_APPROVAL_STATE_MACHINE_V1",
    state: "approvals_not_started",
    generatedAt,
    approvals: {
      uxApproved: false,
      legalApproved: false,
      dataLossApproved: false,
      ownerApproved: false,
    },
    history: [],
    canWireFutureUi: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    routeAllowed: false,
    safe: true,
  };
}

function nextState(state: ImportRestoreApprovalState): ImportRestoreApprovalStateName {
  if (!state.approvals.uxApproved) return "ux_review_pending";
  if (!state.approvals.legalApproved) return "legal_review_pending";
  if (!state.approvals.dataLossApproved) return "data_loss_review_pending";
  if (!state.approvals.ownerApproved) return "owner_decision_pending";
  return "approved_for_future_wiring";
}

export function transitionImportRestoreApprovalState(
  current: ImportRestoreApprovalState,
  event: ImportRestoreApprovalEvent,
  generatedAt = new Date().toISOString(),
): ImportRestoreApprovalState {
  if (event === "reset") return createImportRestoreApprovalState(generatedAt);
  const approvals = { ...current.approvals };
  let state: ImportRestoreApprovalStateName = current.state;

  if (event === "reject") {
    state = "rejected";
  } else if (current.state === "rejected") {
    state = "rejected";
  } else {
    if (event === "start_review") state = "ux_review_pending";
    if (event === "ux_approved") approvals.uxApproved = true;
    if (event === "legal_approved" && approvals.uxApproved) approvals.legalApproved = true;
    if (event === "data_loss_approved" && approvals.uxApproved && approvals.legalApproved) approvals.dataLossApproved = true;
    if (
      event === "owner_approved" &&
      approvals.uxApproved &&
      approvals.legalApproved &&
      approvals.dataLossApproved
    ) {
      approvals.ownerApproved = true;
    }
    if (event !== "start_review") state = nextState({ ...current, approvals });
  }

  const canWireFutureUi = state === "approved_for_future_wiring";
  return {
    marker: "PHASE2D74_IMPORT_RESTORE_APPROVAL_STATE_MACHINE_V1",
    state,
    generatedAt,
    approvals,
    history: [...current.history, event],
    canWireFutureUi,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    routeAllowed: false,
    safe: true,
  };
}

export function summarizeImportRestoreApprovalState(
  state: ImportRestoreApprovalState,
): ImportRestoreApprovalStateSummary {
  return {
    state: state.state,
    approvals: { ...state.approvals },
    canWireFutureUi: state.canWireFutureUi,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
