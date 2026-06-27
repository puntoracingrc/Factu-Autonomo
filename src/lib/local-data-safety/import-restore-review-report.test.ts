import { describe, expect, it } from "vitest";
import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import {
  evaluateLocalDataImportRestoreHumanConfirmation,
} from "./import-restore-confirmation-gate";
import {
  assertLocalDataImportApplyBlocked,
  assertLocalDataRestoreApplyBlocked,
} from "./import-restore-apply-blocker";
import {
  assertLocalDataImportRestoreReviewReportSafe,
  buildLocalDataImportRestoreReviewReport,
  redactLocalDataImportRestoreReviewReport,
} from "./import-restore-review-report";
import { buildLocalDataImportRestoreReviewModel } from "./import-restore-review-model";

// PHASE2D18_IMPORT_RESTORE_REVIEW_FLOW_SAFE_REPORT_V1

function reportFixture() {
  const validation = runLocalDataBackupValidationPipeline(
    { documents: [] },
    {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 500,
      parsedObject: {
        documents: [
          {
            id: "SYNTHETIC_ONLY_doc_1",
            status: "borrador",
            documentLifecycle: "draft",
            documentSnapshot: { raw: "must not leak" },
          },
        ],
      },
    },
    { validatedAt: "2026-06-27T00:00:00.000Z" },
  );
  const reviewModel = buildLocalDataImportRestoreReviewModel(validation);
  const confirmation = evaluateLocalDataImportRestoreHumanConfirmation(validation, reviewModel);
  return buildLocalDataImportRestoreReviewReport({
    validationResult: validation,
    reviewModel,
    confirmation,
    importBlocker: assertLocalDataImportApplyBlocked("2026-06-27T00:00:00.000Z"),
    restoreBlocker: assertLocalDataRestoreApplyBlocked("2026-06-27T00:00:00.000Z"),
    generatedAt: "2026-06-27T00:00:00.000Z",
  });
}

describe("import restore review report", () => {
  it("builds a safe report with apply and restore disabled", () => {
    const report = reportFixture();

    expect(report.marker).toBe("PHASE2D18_IMPORT_RESTORE_REVIEW_FLOW_SAFE_REPORT_V1");
    expect(report.applyAllowed).toBe(false);
    expect(report.restoreAllowed).toBe(false);
    expect(report.safe).toBe(true);
    expect(report.blockers).toContain("APPLY_DISABLED_PENDING_UI_AND_EXTERNAL_REVIEW");
  });

  it("does not leak full app data or snapshots", () => {
    const report = reportFixture();
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("must not leak");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("SYNTHETIC_ONLY_doc_1");
  });

  it("redacts injected unsafe fields and asserts safe output", () => {
    const report = redactLocalDataImportRestoreReviewReport({
      ...reportFixture(),
      rawPayload: "must redact",
    } as never);

    expect(JSON.stringify(report)).not.toContain("rawPayload");
    expect(JSON.stringify(report)).toContain("[redacted]");
    expect(assertLocalDataImportRestoreReviewReportSafe(reportFixture()).safe).toBe(true);
  });
});
