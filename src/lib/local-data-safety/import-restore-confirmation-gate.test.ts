import { describe, expect, it } from "vitest";
import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import {
  buildLocalDataImportRestoreConfirmationChecklist,
  evaluateLocalDataImportRestoreHumanConfirmation,
  summarizeLocalDataImportRestoreConfirmation,
} from "./import-restore-confirmation-gate";
import { buildLocalDataImportRestoreReviewModel } from "./import-restore-review-model";

// PHASE2D14_IMPORT_RESTORE_HUMAN_CONFIRMATION_GATE_V1

function fixture() {
  const validation = runLocalDataBackupValidationPipeline(
    {
      documents: [
        {
          id: "SYNTHETIC_ONLY_issued_1",
          status: "emitida",
          documentLifecycle: "issued",
          integrityLock: "locked",
        },
      ],
      numbering: { invoice: 2 },
    },
    {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 700,
      parsedObject: {
        documents: [
          {
            id: "SYNTHETIC_ONLY_issued_1",
            status: "emitida",
            documentLifecycle: "issued",
            integrityLock: "locked",
          },
        ],
        numbering: { invoice: 9 },
      },
    },
    { validatedAt: "2026-06-27T00:00:00.000Z" },
  );
  const model = buildLocalDataImportRestoreReviewModel(validation);
  return { validation, model };
}

describe("import restore confirmation gate", () => {
  it("creates a default false checklist", () => {
    const checklist = buildLocalDataImportRestoreConfirmationChecklist();

    expect(checklist).toMatchObject({
      backupReviewed: false,
      protectedDocumentsReviewed: false,
      numberingRisksReviewed: false,
      snapshotRisksReviewed: false,
      dryRunReportReviewed: false,
      externalReviewAccepted: false,
    });
  });

  it("requires review for protected overwrite and numbering risk", () => {
    const { validation, model } = fixture();
    const result = evaluateLocalDataImportRestoreHumanConfirmation(validation, model);

    expect(result.manualReviewRequired).toBe(true);
    expect(result.reasons.join(" ")).toContain("Protected");
    expect(result.reasons.join(" ")).toContain("Numbering");
    expect(result.canProceedToApply).toBe(false);
  });

  it("keeps apply blocked even when all approvals are true", () => {
    const { validation, model } = fixture();
    const result = evaluateLocalDataImportRestoreHumanConfirmation(validation, model, {
      backupReviewed: true,
      protectedDocumentsReviewed: true,
      numberingRisksReviewed: true,
      snapshotRisksReviewed: true,
      dryRunReportReviewed: true,
      externalReviewAccepted: true,
    });
    const summary = summarizeLocalDataImportRestoreConfirmation(result);

    expect(result.approvals.externalReviewAccepted).toBe(true);
    expect(summary.canProceedToApply).toBe(false);
    expect(JSON.stringify(summary)).not.toContain("SYNTHETIC_ONLY_issued_1");
  });
});
