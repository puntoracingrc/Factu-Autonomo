// PHASE2D100_HIDDEN_UI_ENABLEMENT_DRY_RUN_STATE_MACHINE_V1

export type HiddenUiEnablementDryRunState =
  | "not_requested"
  | "review_requested"
  | "ux_review_ready"
  | "legal_review_ready"
  | "owner_decision_ready"
  | "future_enablement_ready"
  | "rejected";

export type HiddenUiEnablementDryRunEvent =
  | "request_review"
  | "mark_ux_ready"
  | "mark_legal_ready"
  | "mark_owner_ready"
  | "reject"
  | "reset";

export interface HiddenUiEnablementDryRunStateMachine {
  marker: "PHASE2D100_HIDDEN_UI_ENABLEMENT_DRY_RUN_STATE_MACHINE_V1";
  generatedAt: string;
  state: HiddenUiEnablementDryRunState;
  history: HiddenUiEnablementDryRunEvent[];
  enablementAllowed: false;
  routeAllowed: false;
  navigationAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  configWriteAllowed: false;
  safe: true;
}

export interface HiddenUiEnablementDryRunStateMachineSummary {
  state: HiddenUiEnablementDryRunState;
  historyLength: number;
  enablementAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

function nextState(state: HiddenUiEnablementDryRunState, event: HiddenUiEnablementDryRunEvent): HiddenUiEnablementDryRunState {
  if (event === "reset") return "not_requested";
  if (event === "reject") return "rejected";
  if (state === "rejected") return "rejected";
  if (event === "request_review" && state === "not_requested") return "review_requested";
  if (event === "mark_ux_ready" && state === "review_requested") return "ux_review_ready";
  if (event === "mark_legal_ready" && state === "ux_review_ready") return "legal_review_ready";
  if (event === "mark_owner_ready" && state === "legal_review_ready") return "owner_decision_ready";
  if (event === "mark_owner_ready" && state === "owner_decision_ready") return "future_enablement_ready";
  return state;
}

export function createHiddenUiEnablementDryRunStateMachine(
  input: { generatedAt?: string } = {},
): HiddenUiEnablementDryRunStateMachine {
  return {
    marker: "PHASE2D100_HIDDEN_UI_ENABLEMENT_DRY_RUN_STATE_MACHINE_V1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    state: "not_requested",
    history: [],
    enablementAllowed: false,
    routeAllowed: false,
    navigationAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    configWriteAllowed: false,
    safe: true,
  };
}

export function transitionHiddenUiEnablementDryRunStateMachine(
  machine: HiddenUiEnablementDryRunStateMachine,
  event: HiddenUiEnablementDryRunEvent,
): HiddenUiEnablementDryRunStateMachine {
  return {
    ...machine,
    state: nextState(machine.state, event),
    history: [...machine.history, event],
    enablementAllowed: false,
    routeAllowed: false,
    navigationAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    configWriteAllowed: false,
    safe: true,
  };
}

export function summarizeHiddenUiEnablementDryRunStateMachine(
  machine: HiddenUiEnablementDryRunStateMachine,
): HiddenUiEnablementDryRunStateMachineSummary {
  return {
    state: machine.state,
    historyLength: machine.history.length,
    enablementAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
