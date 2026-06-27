import { describe, expect, it } from "vitest";
import {
  buildRoutelessImportRestoreUiHarnessBlockers,
  evaluateRoutelessImportRestoreUiHarnessScope,
  summarizeRoutelessImportRestoreUiHarnessScope,
} from "./routeless-ui-harness-scope";

// PHASE2D45_ROUTELESS_IMPORT_RESTORE_UI_HARNESS_SCOPE_V1

describe("routeless import/restore UI harness scope", () => {
  it("is blocked by default", () => {
    const scope = evaluateRoutelessImportRestoreUiHarnessScope({
      generatedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(scope.status).toBe("blocked_by_default");
    expect(scope.routeAllowed).toBe(false);
    expect(scope.navigationAllowed).toBe(false);
    expect(scope.importApplyAllowed).toBe(false);
    expect(scope.restoreApplyAllowed).toBe(false);
    expect(scope.blockers).toContain("Synthetic-only fixtures are required.");
  });

  it("moves to preview harness ready before UX/legal packet exists", () => {
    const blockers = buildRoutelessImportRestoreUiHarnessBlockers({
      syntheticFixturesOnly: true,
      viewModelProvided: true,
      disabledActionsProvided: true,
      stateMachineProvided: true,
      reviewSessionProvided: true,
      dataLossWarningsProvided: true,
    });
    const scope = evaluateRoutelessImportRestoreUiHarnessScope({
      syntheticFixturesOnly: true,
      viewModelProvided: true,
      disabledActionsProvided: true,
      stateMachineProvided: true,
      reviewSessionProvided: true,
      dataLossWarningsProvided: true,
    });

    expect(scope.status).toBe("preview_harness_ready");
    expect(blockers).toContain("UX/legal review packet is required before review.");
  });

  it("is ready for UX review only when the packet exists", () => {
    const scope = evaluateRoutelessImportRestoreUiHarnessScope({
      syntheticFixturesOnly: true,
      viewModelProvided: true,
      disabledActionsProvided: true,
      stateMachineProvided: true,
      reviewSessionProvided: true,
      dataLossWarningsProvided: true,
      uxLegalReviewPacketPrepared: true,
    });
    const summary = summarizeRoutelessImportRestoreUiHarnessScope(scope);

    expect(scope.status).toBe("ready_for_ux_review");
    expect(summary.safe).toBe(true);
    expect(summary.blockers).toEqual([]);
  });

  it("rejects any connected route, navigation, picker, storage or apply behavior", () => {
    const scope = evaluateRoutelessImportRestoreUiHarnessScope({
      syntheticFixturesOnly: true,
      viewModelProvided: true,
      disabledActionsProvided: true,
      stateMachineProvided: true,
      reviewSessionProvided: true,
      dataLossWarningsProvided: true,
      uxLegalReviewPacketPrepared: true,
      routeConnected: true,
      navigationConnected: true,
      filePickerConnected: true,
      browserStorageReadConnected: true,
      browserStorageWriteConnected: true,
      importApplyConnected: true,
      restoreApplyConnected: true,
      realDataUsed: true,
    });

    expect(scope.status).toBe("rejected");
    expect(scope.blockers.join(" ")).toMatch(/Route connection is not allowed/);
    expect(scope.blockers.join(" ")).toMatch(/Import apply is not allowed/);
  });
});
