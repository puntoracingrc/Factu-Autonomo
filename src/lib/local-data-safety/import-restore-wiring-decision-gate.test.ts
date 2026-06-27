import { describe, expect, it } from "vitest";
import {
  buildImportRestoreWiringDecisionBlockers,
  evaluateImportRestoreWiringDecisionGate,
  summarizeImportRestoreWiringDecisionGate,
} from "./import-restore-wiring-decision-gate";

// PHASE2D69_IMPORT_RESTORE_WIRING_DECISION_GATE_V1

describe("import/restore wiring decision gate", () => {
  it("is blocked by default and never enables real actions", () => {
    const gate = evaluateImportRestoreWiringDecisionGate({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const summary = summarizeImportRestoreWiringDecisionGate(gate);

    expect(gate.status).toBe("blocked_by_default");
    expect(gate.canWireUi).toBe(false);
    expect(gate.applyImportAllowed).toBe(false);
    expect(gate.applyRestoreAllowed).toBe(false);
    expect(summary.safe).toBe(true);
    expect(gate.blockers.length).toBeGreaterThan(0);
  });

  it("becomes ready for owner decision only when review evidence is complete", () => {
    const gate = evaluateImportRestoreWiringDecisionGate({
      corpusRegressionPassed: true,
      uiWiringGatePassed: true,
      uxDataLossPacketPrepared: true,
      legalReviewPacketPrepared: true,
      approvalTemplatePrepared: true,
      approvalsAllFalse: true,
      storageAdapterDisabled: true,
      filePickerDisabled: true,
      generatedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(gate.status).toBe("ready_for_owner_decision");
    expect(gate.blockers).toEqual([]);
    expect(gate.routeAllowed).toBe(false);
    expect(gate.navigationAllowed).toBe(false);
  });

  it("rejects any accidental activation signal", () => {
    const blockers = buildImportRestoreWiringDecisionBlockers({
      corpusRegressionPassed: true,
      uiWiringGatePassed: true,
      uxDataLossPacketPrepared: true,
      legalReviewPacketPrepared: true,
      approvalTemplatePrepared: true,
      approvalsAllFalse: true,
      storageAdapterDisabled: true,
      filePickerDisabled: true,
      applyImportAllowed: true,
    });
    const gate = evaluateImportRestoreWiringDecisionGate({
      corpusRegressionPassed: true,
      uiWiringGatePassed: true,
      uxDataLossPacketPrepared: true,
      legalReviewPacketPrepared: true,
      approvalTemplatePrepared: true,
      approvalsAllFalse: true,
      storageAdapterDisabled: true,
      filePickerDisabled: true,
      applyImportAllowed: true,
    });

    expect(gate.status).toBe("rejected");
    expect(blockers).toContain("Import apply is rejected.");
  });
});
