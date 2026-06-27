import { describe, expect, it } from "vitest";
import { evaluateHiddenImportRestoreUiShellFlag } from "./hidden-ui-shell-flag";
import {
  buildHiddenImportRestoreUiEnablementBlockers,
  evaluateHiddenImportRestoreUiEnablementGate,
  summarizeHiddenImportRestoreUiEnablementGate,
} from "./hidden-ui-enablement-gate";

// PHASE2D93_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_GATE_V1

const generatedAt = "2026-06-27T00:00:00.000Z";
const enabledShell = evaluateHiddenImportRestoreUiShellFlag({
  generatedAt,
  runtime: "test",
  envLike: {
    IMPORT_RESTORE_HIDDEN_UI_SHELL_ENABLED: "true",
    IMPORT_RESTORE_HIDDEN_UI_SHELL_MODE: "routeless_preview_only",
  },
});

function approvedInput() {
  return {
    generatedAt,
    shellFlag: enabledShell,
    noRouteAcceptancePassed: true,
    noStorageAcceptancePassed: true,
    uxLegalDataLossPacketPrepared: true,
    ownerDecisionPacketPrepared: true,
    approvals: {
      uxReviewApproved: true,
      legalReviewApproved: true,
      dataLossReviewApproved: true,
      ownerApproved: true,
    },
    noGoConditionsCleared: true,
  };
}

describe("PHASE2D93 hidden UI enablement gate", () => {
  it("is blocked by default", () => {
    const gate = evaluateHiddenImportRestoreUiEnablementGate({ generatedAt });

    expect(gate.status).toBe("blocked_by_default");
    expect(gate.enablementAllowed).toBe(false);
    expect(gate.blockers.length).toBeGreaterThan(0);
  });

  it("blocks when the shell flag is missing", () => {
    const blockers = buildHiddenImportRestoreUiEnablementBlockers({ generatedAt });

    expect(blockers.map((entry) => entry.id)).toContain("hidden_shell_flag_missing");
  });

  it("rejects route, storage and apply hazards", () => {
    expect(evaluateHiddenImportRestoreUiEnablementGate({ ...approvedInput(), routeExists: true }).status).toBe("rejected");
    expect(evaluateHiddenImportRestoreUiEnablementGate({ ...approvedInput(), browserStorageWriteEnabled: true }).status).toBe("rejected");
    expect(evaluateHiddenImportRestoreUiEnablementGate({ ...approvedInput(), applyImportEnabled: true }).status).toBe("rejected");
  });

  it("blocks when approvals are missing", () => {
    const gate = evaluateHiddenImportRestoreUiEnablementGate({
      ...approvedInput(),
      approvals: { uxReviewApproved: true },
    });

    expect(gate.status).not.toBe("ready_for_future_hidden_enablement");
    expect(summarizeHiddenImportRestoreUiEnablementGate(gate).blockerIds).toContain("owner_approval_missing");
  });

  it("can become ready for future hidden enablement without enabling anything", () => {
    const gate = evaluateHiddenImportRestoreUiEnablementGate(approvedInput());

    expect(gate.status).toBe("ready_for_future_hidden_enablement");
    expect(gate.enablementAllowed).toBe(false);
    expect(gate.applyRestoreAllowed).toBe(false);
    expect(summarizeHiddenImportRestoreUiEnablementGate(gate).safe).toBe(true);
  });
});
