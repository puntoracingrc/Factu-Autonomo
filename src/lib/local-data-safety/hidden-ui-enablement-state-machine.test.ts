import { describe, expect, it } from "vitest";
import {
  createHiddenUiEnablementDryRunStateMachine,
  summarizeHiddenUiEnablementDryRunStateMachine,
  transitionHiddenUiEnablementDryRunStateMachine,
} from "./hidden-ui-enablement-state-machine";

// PHASE2D100_HIDDEN_UI_ENABLEMENT_DRY_RUN_STATE_MACHINE_V1

describe("PHASE2D100 hidden UI enablement dry-run state machine", () => {
  it("starts as not requested", () => {
    const machine = createHiddenUiEnablementDryRunStateMachine({ generatedAt: "2026-06-27T00:00:00.000Z" });

    expect(machine.state).toBe("not_requested");
    expect(machine.enablementAllowed).toBe(false);
  });

  it("can walk the full future-ready dry-run path without enabling anything", () => {
    let machine = createHiddenUiEnablementDryRunStateMachine();
    for (const event of ["request_review", "mark_ux_ready", "mark_legal_ready", "mark_owner_ready", "mark_owner_ready"] as const) {
      machine = transitionHiddenUiEnablementDryRunStateMachine(machine, event);
    }

    expect(machine.state).toBe("future_enablement_ready");
    expect(machine.applyImportAllowed).toBe(false);
    expect(summarizeHiddenUiEnablementDryRunStateMachine(machine).enablementAllowed).toBe(false);
  });

  it("can reject and reset", () => {
    const rejected = transitionHiddenUiEnablementDryRunStateMachine(createHiddenUiEnablementDryRunStateMachine(), "reject");
    const reset = transitionHiddenUiEnablementDryRunStateMachine(rejected, "reset");

    expect(rejected.state).toBe("rejected");
    expect(reset.state).toBe("not_requested");
    expect(reset.applyRestoreAllowed).toBe(false);
  });
});
