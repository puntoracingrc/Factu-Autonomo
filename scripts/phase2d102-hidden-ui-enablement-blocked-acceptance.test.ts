import { describe, expect, it } from "vitest";
import {
  buildHiddenImportRestoreShellReadinessReport,
  buildHiddenUiOwnerDecisionPacket,
  createHiddenUiEnablementDryRunStateMachine,
  evaluateHiddenImportRestoreUiEnablementGate,
  evaluateHiddenImportRestoreUiShellFlag,
  evaluateHiddenUiEnablementEnvironment,
  evaluateImportRestoreNoGoConditions,
  summarizeHiddenImportRestoreShellReadinessReport,
  summarizeHiddenUiOwnerDecisionPacket,
  transitionHiddenUiEnablementDryRunStateMachine,
} from "../src/lib/local-data-safety";

// PHASE2D102_HIDDEN_UI_ENABLEMENT_BLOCKED_ACCEPTANCE_V1

const generatedAt = "2026-06-27T00:00:00.000Z";
const hiddenShell = evaluateHiddenImportRestoreUiShellFlag({
  generatedAt,
  runtime: "test",
  envLike: {
    IMPORT_RESTORE_HIDDEN_UI_SHELL_ENABLED: "true",
    IMPORT_RESTORE_HIDDEN_UI_SHELL_MODE: "routeless_preview_only",
  },
});

describe("PHASE2D102 hidden UI enablement blocked acceptance", () => {
  it("keeps default enablement blocked and checklist-all-false blocked", () => {
    expect(evaluateHiddenImportRestoreUiEnablementGate({ generatedAt }).status).toBe("blocked_by_default");
    expect(
      evaluateHiddenImportRestoreUiEnablementGate({
        generatedAt,
        shellFlag: hiddenShell,
        noRouteAcceptancePassed: true,
        noStorageAcceptancePassed: true,
        uxLegalDataLossPacketPrepared: true,
        ownerDecisionPacketPrepared: true,
        noGoConditionsCleared: true,
        approvals: {},
      }).status,
    ).not.toBe("ready_for_future_hidden_enablement");
  });

  it("rejects public and production environment requests", () => {
    expect(evaluateHiddenUiEnablementEnvironment({ envLike: { NEXT_PUBLIC_ENABLEMENT: "true" } }).status).toBe("rejected_public_flag");
    expect(evaluateHiddenUiEnablementEnvironment({ runtime: "production" }).status).toBe("rejected_production_or_remote");
  });

  it("blocks route, storage and apply no-go conditions", () => {
    expect(evaluateImportRestoreNoGoConditions({ routeExists: true }).noGo).toBe(true);
    expect(evaluateImportRestoreNoGoConditions({ browserStorageWriteEnabled: true }).noGo).toBe(true);
    expect(evaluateImportRestoreNoGoConditions({ applyRestoreEnabled: true }).noGo).toBe(true);
  });

  it("does not let the owner packet authorize by itself", () => {
    const packet = buildHiddenUiOwnerDecisionPacket({ generatedAt });

    expect(packet.authorizesEnablement).toBe(false);
    expect(summarizeHiddenUiOwnerDecisionPacket(packet).authorizesEnablement).toBe(false);
  });

  it("keeps dry-run state machine from enabling UI", () => {
    let machine = createHiddenUiEnablementDryRunStateMachine({ generatedAt });
    machine = transitionHiddenUiEnablementDryRunStateMachine(machine, "request_review");
    machine = transitionHiddenUiEnablementDryRunStateMachine(machine, "mark_ux_ready");
    machine = transitionHiddenUiEnablementDryRunStateMachine(machine, "mark_legal_ready");
    machine = transitionHiddenUiEnablementDryRunStateMachine(machine, "mark_owner_ready");
    machine = transitionHiddenUiEnablementDryRunStateMachine(machine, "mark_owner_ready");

    expect(machine.state).toBe("future_enablement_ready");
    expect(machine.enablementAllowed).toBe(false);
    expect(machine.applyImportAllowed).toBe(false);
  });

  it("keeps readiness report safe and blocked", () => {
    const report = buildHiddenImportRestoreShellReadinessReport({ generatedAt });
    const summary = summarizeHiddenImportRestoreShellReadinessReport(report);

    expect(summary.enablementAllowed).toBe(false);
    expect(report.realDataIncluded).toBe(false);
  });

  it("keeps route, navigation, storage and apply disabled in gate output", () => {
    const gate = evaluateHiddenImportRestoreUiEnablementGate({ generatedAt });

    expect(gate.routeAllowed).toBe(false);
    expect(gate.navigationAllowed).toBe(false);
    expect(gate.storageReadAllowed).toBe(false);
    expect(gate.storageWriteAllowed).toBe(false);
    expect(gate.applyImportAllowed).toBe(false);
    expect(gate.applyRestoreAllowed).toBe(false);
  });
});
