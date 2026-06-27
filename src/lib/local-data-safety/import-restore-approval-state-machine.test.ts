import { describe, expect, it } from "vitest";
import {
  createImportRestoreApprovalState,
  summarizeImportRestoreApprovalState,
  transitionImportRestoreApprovalState,
} from "./import-restore-approval-state-machine";

// PHASE2D74_IMPORT_RESTORE_APPROVAL_STATE_MACHINE_V1

describe("import/restore approval state machine", () => {
  it("starts with all approvals false and all real actions disabled", () => {
    const state = createImportRestoreApprovalState("2026-06-27T00:00:00.000Z");
    const summary = summarizeImportRestoreApprovalState(state);

    expect(state.state).toBe("approvals_not_started");
    expect(Object.values(summary.approvals).every((value) => value === false)).toBe(true);
    expect(summary.applyImportAllowed).toBe(false);
    expect(summary.applyRestoreAllowed).toBe(false);
  });

  it("can reach future wiring approval without enabling apply or routes", () => {
    let state = createImportRestoreApprovalState("2026-06-27T00:00:00.000Z");
    state = transitionImportRestoreApprovalState(state, "start_review", "2026-06-27T00:00:01.000Z");
    state = transitionImportRestoreApprovalState(state, "ux_approved", "2026-06-27T00:00:02.000Z");
    state = transitionImportRestoreApprovalState(state, "legal_approved", "2026-06-27T00:00:03.000Z");
    state = transitionImportRestoreApprovalState(state, "data_loss_approved", "2026-06-27T00:00:04.000Z");
    state = transitionImportRestoreApprovalState(state, "owner_approved", "2026-06-27T00:00:05.000Z");

    expect(state.state).toBe("approved_for_future_wiring");
    expect(state.canWireFutureUi).toBe(true);
    expect(state.applyImportAllowed).toBe(false);
    expect(state.applyRestoreAllowed).toBe(false);
    expect(state.routeAllowed).toBe(false);
  });

  it("supports rejection and reset", () => {
    let state = createImportRestoreApprovalState("2026-06-27T00:00:00.000Z");
    state = transitionImportRestoreApprovalState(state, "reject");
    expect(state.state).toBe("rejected");

    state = transitionImportRestoreApprovalState(state, "reset", "2026-06-27T00:00:10.000Z");
    expect(state.state).toBe("approvals_not_started");
    expect(state.history).toEqual([]);
  });
});
