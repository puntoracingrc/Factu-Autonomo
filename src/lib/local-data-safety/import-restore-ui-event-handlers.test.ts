import { describe, expect, it } from "vitest";
import {
  createImportRestoreDisabledUiEventHandlers,
  handleImportRestoreApplyImportClicked,
  handleImportRestoreApplyRestoreClicked,
  handleImportRestorePreviewRequested,
  summarizeImportRestoreUiHandlerResult,
} from "./import-restore-ui-event-handlers";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1

function currentData(): LocalDataSafetyAppData {
  return { documents: [] };
}

describe("import restore UI event handlers", () => {
  it("returns preview dry-run without mutation", () => {
    const current = currentData();
    const before = JSON.stringify(current);
    const result = handleImportRestorePreviewRequested({
      currentData: current,
      rawJson: JSON.stringify({ documents: [] }),
      parsedAt: "2026-06-27T00:00:00.000Z",
    });
    const summary = summarizeImportRestoreUiHandlerResult(result);

    expect(result.status).toBe("preview_ready");
    expect(summary.mutated).toBe(false);
    expect(JSON.stringify(current)).toBe(before);
  });

  it("blocks import apply clicks", () => {
    const result = handleImportRestoreApplyImportClicked("2026-06-27T00:00:00.000Z");

    expect(result.status).toBe("blocked");
    expect(result.blocker?.blocked).toBe(true);
    expect(result.mutated).toBe(false);
  });

  it("blocks restore apply clicks", () => {
    const result = handleImportRestoreApplyRestoreClicked("2026-06-27T00:00:00.000Z");

    expect(result.status).toBe("blocked");
    expect(result.blocker?.operation).toBe("restore");
  });

  it("factory creates no-op blocked handlers", () => {
    const handlers = createImportRestoreDisabledUiEventHandlers();

    expect(handlers.handleApplyImportClicked().status).toBe("blocked");
    expect(handlers.handleApplyRestoreClicked().status).toBe("blocked");
  });
});
