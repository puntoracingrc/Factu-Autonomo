import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildImportRestoreDataLossWarnings,
  createImportRestoreReviewSession,
  createImportRestorePreviewFlowState,
  getImportRestoreSyntheticUiFixture,
  parseInMemoryBackupJsonForPreview,
  transitionImportRestorePreviewFlowState,
  updateImportRestoreReviewSession,
} from "../src/lib/local-data-safety";

// PHASE2D52_ROUTELESS_IMPORT_RESTORE_UI_INTERACTION_ACCEPTANCE_V1

const root = path.resolve(new URL("../", import.meta.url).pathname);

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const runtimeFiles = [
  "src/lib/local-data-safety/routeless-ui-harness-scope.ts",
  "src/lib/local-data-safety/import-restore-ui-fixtures.ts",
  "src/lib/local-data-safety/import-restore-preview-state-machine.ts",
  "src/lib/local-data-safety/import-restore-review-session.ts",
  "src/lib/local-data-safety/import-restore-data-loss-warning.ts",
  "src/lib/local-data-safety/recovery-snapshot-download-placeholder.ts",
  "src/lib/local-data-safety/import-restore-ux-legal-review-packet.ts",
];

describe("phase 2D.52 routeless import/restore UI interaction acceptance", () => {
  it("loads a safe fixture, parses preview, builds review and blocks apply", () => {
    const fixture = getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW");
    const preview = parseInMemoryBackupJsonForPreview({
      currentData: fixture.currentData,
      rawJson: fixture.rawJson,
      parsedAt: "2026-06-27T00:00:00.000Z",
    });

    let state = createImportRestorePreviewFlowState("2026-06-27T00:00:00.000Z");
    state = transitionImportRestorePreviewFlowState(state, {
      type: "select_synthetic_fixture",
      fixtureId: fixture.id,
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
    let session = createImportRestoreReviewSession({ flowState: state });
    session = updateImportRestoreReviewSession(session, {
      type: "click_apply_import",
      occurredAt: "2026-06-27T00:00:04.000Z",
    });
    session = updateImportRestoreReviewSession(session, {
      type: "click_apply_restore",
      occurredAt: "2026-06-27T00:00:05.000Z",
    });

    expect(preview.status).toBe("preview_ready");
    expect(state.status).toBe("review_ready");
    expect(session.currentState).toBe("apply_blocked");
    expect(session.applyImportAllowed).toBe(false);
    expect(session.applyRestoreAllowed).toBe(false);
    expect(session.persisted).toBe(false);
  });

  it("resets preview and rejects malformed fixtures safely", () => {
    let state = createImportRestorePreviewFlowState("2026-06-27T00:00:00.000Z");
    state = transitionImportRestorePreviewFlowState(state, {
      type: "select_synthetic_fixture",
      fixtureId: "SYNTHETIC_ONLY_MALFORMED_BACKUP_REJECTED",
    });
    state = transitionImportRestorePreviewFlowState(state, { type: "parse_preview" });

    expect(state.status).toBe("error_safe");

    state = transitionImportRestorePreviewFlowState(state, { type: "reset_preview" });

    expect(state.status).toBe("idle_disabled");
    expect(state.mutated).toBe(false);
  });

  it("shows warnings in the model", () => {
    const warnings = buildImportRestoreDataLossWarnings({
      fixture: getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_PROTECTED_OVERWRITE_WARNING"),
      generatedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(warnings.warnings.map((warning) => warning.id)).toContain("protected_documents");
    expect(warnings.warnings.map((warning) => warning.id)).toContain("apply_disabled");
    expect(warnings.applyImportAllowed).toBe(false);
  });

  it("does not wire browser storage, real file reader, routes or navigation", () => {
    const joined = runtimeFiles.map(read).join("\n");
    const storageGlobal = "local" + "Storage";
    const fileReaderGlobal = "File" + "Reader";

    expect(joined).not.toContain(storageGlobal);
    expect(joined).not.toContain(fileReaderGlobal);
    expect(joined).not.toMatch(/next\/navigation|next\/router|next\/link|src\/app|app\/api/);
  });
});
