import { describe, expect, it } from "vitest";
import {
  createImportRestorePreviewFlowState,
  summarizeImportRestorePreviewFlowState,
  transitionImportRestorePreviewFlowState,
} from "./import-restore-preview-state-machine";

// PHASE2D47_IMPORT_RESTORE_PREVIEW_FLOW_STATE_MACHINE_V1

describe("import/restore preview flow state machine", () => {
  it("drives a safe fixture to review_ready without enabling apply", () => {
    let state = createImportRestorePreviewFlowState("2026-06-27T00:00:00.000Z");
    state = transitionImportRestorePreviewFlowState(state, {
      type: "select_synthetic_fixture",
      fixtureId: "SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW",
      occurredAt: "2026-06-27T00:00:01.000Z",
    });
    state = transitionImportRestorePreviewFlowState(state, {
      type: "parse_preview",
      occurredAt: "2026-06-27T00:00:02.000Z",
    });
    state = transitionImportRestorePreviewFlowState(state, {
      type: "build_review",
      occurredAt: "2026-06-27T00:00:03.000Z",
    });
    const summary = summarizeImportRestorePreviewFlowState(state);

    expect(state.status).toBe("review_ready");
    expect(summary.applyImportAllowed).toBe(false);
    expect(summary.applyRestoreAllowed).toBe(false);
    expect(summary.mutated).toBe(false);
    expect(summary.auditEvents).toBe(3);
  });

  it("routes manual-review fixtures to manual_review_required", () => {
    let state = createImportRestorePreviewFlowState("2026-06-27T00:00:00.000Z");
    state = transitionImportRestorePreviewFlowState(state, {
      type: "select_synthetic_fixture",
      fixtureId: "SYNTHETIC_ONLY_PROTECTED_OVERWRITE_WARNING",
    });
    state = transitionImportRestorePreviewFlowState(state, { type: "parse_preview" });
    state = transitionImportRestorePreviewFlowState(state, { type: "build_review" });

    expect(state.status).toBe("manual_review_required");
    expect(state.blockers.join(" ")).toMatch(/Manual review is required/);
  });

  it("blocks import and restore apply clicks", () => {
    let state = createImportRestorePreviewFlowState("2026-06-27T00:00:00.000Z");
    state = transitionImportRestorePreviewFlowState(state, { type: "click_apply_import" });

    expect(state.status).toBe("apply_blocked");
    expect(state.mutated).toBe(false);

    state = transitionImportRestorePreviewFlowState(state, { type: "click_apply_restore" });

    expect(state.status).toBe("apply_blocked");
    expect(state.applyRestoreAllowed).toBe(false);
  });

  it("moves malformed preview to error_safe and can reset", () => {
    let state = createImportRestorePreviewFlowState("2026-06-27T00:00:00.000Z");
    state = transitionImportRestorePreviewFlowState(state, {
      type: "select_synthetic_fixture",
      fixtureId: "SYNTHETIC_ONLY_MALFORMED_BACKUP_REJECTED",
    });
    state = transitionImportRestorePreviewFlowState(state, { type: "parse_preview" });

    expect(state.status).toBe("error_safe");

    state = transitionImportRestorePreviewFlowState(state, { type: "reset_preview" });

    expect(state.status).toBe("idle_disabled");
  });
});
