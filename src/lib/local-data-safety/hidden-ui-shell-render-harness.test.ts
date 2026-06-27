import { describe, expect, it } from "vitest";
import {
  buildHiddenImportRestoreUiShellHarnessProps,
  renderHiddenImportRestoreUiShellModel,
  summarizeHiddenImportRestoreUiShellHarness,
} from "./hidden-ui-shell-render-harness";

// PHASE2D88_HIDDEN_IMPORT_RESTORE_UI_SHELL_RENDER_HARNESS_V1

describe("hidden import/restore UI shell render harness", () => {
  it("builds synthetic-only routeless props with apply disabled", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({
      generatedAt: "2026-06-27T00:00:00.000Z",
      flagInput: {
        envLike: {
          IMPORT_RESTORE_HIDDEN_UI_SHELL_ENABLED: "true",
          IMPORT_RESTORE_HIDDEN_UI_SHELL_MODE: "routeless_preview_only",
        },
        runtime: "test",
      },
    });
    const summary = summarizeHiddenImportRestoreUiShellHarness(props);

    expect(props.hidden).toBe(true);
    expect(props.routelessOnly).toBe(true);
    expect(props.routeAllowed).toBe(false);
    expect(props.navigationAllowed).toBe(false);
    expect(props.filePickerAllowed).toBe(false);
    expect(props.applyImportAllowed).toBe(false);
    expect(props.applyRestoreAllowed).toBe(false);
    expect(summary.panelCount).toBe(5);
  });

  it("renders a safe model without routes, storage or raw data", () => {
    const props = buildHiddenImportRestoreUiShellHarnessProps({
      selectedFixtureId: "SYNTHETIC_ONLY_COUNTERS_MISMATCH_BACKUP",
      generatedAt: "2026-06-27T00:00:00.000Z",
    });
    const model = renderHiddenImportRestoreUiShellModel(props);
    const serialized = JSON.stringify(model);

    expect(model.selectedFixtureId).toBe("SYNTHETIC_ONLY_COUNTERS_MISMATCH_BACKUP");
    expect(model.routeAllowed).toBe(false);
    expect(model.applyImportAllowed).toBe(false);
    expect(model.applyRestoreAllowed).toBe(false);
    expect(serialized).not.toMatch(/documentSnapshot|authorization|cookie|privateKey/i);
  });
});
