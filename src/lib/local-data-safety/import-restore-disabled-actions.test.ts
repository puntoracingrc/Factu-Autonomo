import { describe, expect, it } from "vitest";
import {
  assertImportRestoreActionBlocked,
  buildImportRestoreDisabledActions,
  summarizeImportRestoreDisabledActions,
} from "./import-restore-disabled-actions";

// PHASE2D23_IMPORT_RESTORE_DISABLED_ACTION_MODEL_V1

describe("import restore disabled action model", () => {
  it("blocks import and restore apply actions", () => {
    const model = buildImportRestoreDisabledActions({ generatedAt: "2026-06-27T00:00:00.000Z" });

    expect(assertImportRestoreActionBlocked(model, "apply_import").disabled).toBe(true);
    expect(assertImportRestoreActionBlocked(model, "apply_restore").disabled).toBe(true);
    expect(model.applyImportBlocked).toBe(true);
    expect(model.applyRestoreBlocked).toBe(true);
  });

  it("keeps approvals-like inputs irrelevant", () => {
    const approvals = { externalReviewAccepted: true };
    const before = JSON.stringify(approvals);
    const model = buildImportRestoreDisabledActions();

    expect(assertImportRestoreActionBlocked(model, "download_recovery_snapshot").state).toBe("blocked");
    expect(JSON.stringify(approvals)).toBe(before);
  });

  it("blocks unknown action ids by default and summarizes safely", () => {
    const model = buildImportRestoreDisabledActions();
    const unknown = assertImportRestoreActionBlocked(model, "SYNTHETIC_ONLY_unknown");
    const summary = summarizeImportRestoreDisabledActions(model);

    expect(unknown.disabled).toBe(true);
    expect(summary.blockedActionIds).toContain("apply_import");
    expect(summary.previewOnlyActionIds).toEqual(["validate_backup", "build_review"]);
    expect(JSON.stringify(summary)).not.toContain("SYNTHETIC_ONLY_unknown");
  });
});
