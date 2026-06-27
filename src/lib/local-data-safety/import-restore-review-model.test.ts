import { describe, expect, it } from "vitest";
import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import {
  buildLocalDataImportRestoreReviewModel,
  summarizeLocalDataImportRestoreReviewModel,
} from "./import-restore-review-model";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D13_IMPORT_RESTORE_REVIEW_MODEL_V1

function validationWithProtectedOverwrite() {
  const current: LocalDataSafetyAppData = {
    documents: [
      {
        id: "SYNTHETIC_ONLY_issued_1",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        snapshotHash: "snapshot:current",
      },
    ],
  };
  const incoming: LocalDataSafetyAppData = {
    documents: [
      {
        id: "SYNTHETIC_ONLY_issued_1",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        snapshotHash: "snapshot:incoming",
      },
    ],
  };
  return runLocalDataBackupValidationPipeline(current, {
    fileName: "backup.json",
    mimeType: "application/json",
    byteLength: 900,
    parsedObject: incoming,
  });
}

describe("import restore review model", () => {
  it("builds a UI-facing model without UI", () => {
    const model = buildLocalDataImportRestoreReviewModel(validationWithProtectedOverwrite());

    expect(model.marker).toBe("PHASE2D13_IMPORT_RESTORE_REVIEW_MODEL_V1");
    expect(model.status).toBe("ready_for_review");
    expect(model.sections.map((section) => section.id)).toEqual([
      "overview",
      "backup_summary",
      "import_risks",
      "restore_risks",
      "blockers",
    ]);
  });

  it("elevates protected docs and restore conflicts to manual review", () => {
    const model = buildLocalDataImportRestoreReviewModel(validationWithProtectedOverwrite());

    expect(model.severity).toBe("warning");
    expect(model.manualReviewRequired).toBe(true);
    expect(model.protectedDocumentsCount).toBe(1);
    expect(model.riskFlags).toContain("review_manual_confirmation_required");
  });

  it("keeps apply actions blocked in the summary", () => {
    const summary = summarizeLocalDataImportRestoreReviewModel(
      buildLocalDataImportRestoreReviewModel(validationWithProtectedOverwrite()),
    );

    expect(summary.actions.allowDryRunOnly).toBe(true);
    expect(summary.actions.allowApplyImport).toBe(false);
    expect(summary.actions.allowApplyRestore).toBe(false);
    expect(JSON.stringify(summary)).not.toContain("SYNTHETIC_ONLY_issued_1");
  });
});
