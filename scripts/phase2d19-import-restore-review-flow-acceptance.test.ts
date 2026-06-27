import { describe, expect, it } from "vitest";
import {
  assertLocalDataImportApplyBlocked,
  assertLocalDataRestoreApplyBlocked,
  buildLocalDataImportRestoreReviewReport,
  buildLocalDataImportRestoreReviewModel,
  createDisabledLocalDataStorageAdapter,
  detectMalformedLocalDataBackup,
  evaluateLocalDataImportRestoreHumanConfirmation,
  inspectLocalDataBackupIntakeCandidate,
  runLocalDataBackupValidationPipeline,
} from "../src/lib/local-data-safety";
import type { LocalDataSafetyAppData } from "../src/lib/local-data-safety";

// PHASE2D19_IMPORT_RESTORE_REVIEW_FLOW_ACCEPTANCE_V1

function currentData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_issued_1",
        kind: "invoice",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        number: "2026-1",
        year: 2026,
        snapshotHash: "snapshot:current",
      },
    ],
    customers: [{ id: "SYNTHETIC_ONLY_customer_1", name: "Synthetic Customer" }],
    counters: { invoice: 1 },
  };
}

function backupData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_issued_1",
        kind: "invoice",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        number: "2026-1",
        year: 2026,
        snapshotHash: "snapshot:incoming",
      },
      {
        id: "SYNTHETIC_ONLY_draft_2",
        kind: "invoice",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      },
    ],
    customers: [{ id: "SYNTHETIC_ONLY_customer_2", name: "Synthetic Other" }],
    counters: { invoice: 2 },
  };
}

describe("phase 2D.19 import restore review flow acceptance", () => {
  it("keeps the full review flow pure, disabled and safe", () => {
    const current = currentData();
    const incoming = backupData();
    const beforeCurrent = JSON.stringify(current);
    const beforeIncoming = JSON.stringify(incoming);

    const intake = inspectLocalDataBackupIntakeCandidate({
      fileName: "factura-autonomo-copia-synthetic.json",
      mimeType: "application/json",
      byteLength: 2048,
      parsedObject: incoming,
    });
    const validation = runLocalDataBackupValidationPipeline(
      current,
      {
        fileName: "factura-autonomo-copia-synthetic.json",
        mimeType: "application/json",
        byteLength: 2048,
        parsedObject: incoming,
      },
      { validatedAt: "2026-06-27T00:00:00.000Z" },
    );
    const reviewModel = buildLocalDataImportRestoreReviewModel(validation);
    const confirmationDefault = evaluateLocalDataImportRestoreHumanConfirmation(validation, reviewModel);
    const confirmationApproved = evaluateLocalDataImportRestoreHumanConfirmation(validation, reviewModel, {
      backupReviewed: true,
      protectedDocumentsReviewed: true,
      numberingRisksReviewed: true,
      snapshotRisksReviewed: true,
      dryRunReportReviewed: true,
      externalReviewAccepted: true,
    });
    const importBlocker = assertLocalDataImportApplyBlocked("2026-06-27T00:00:00.000Z");
    const restoreBlocker = assertLocalDataRestoreApplyBlocked("2026-06-27T00:00:00.000Z");
    const adapter = createDisabledLocalDataStorageAdapter("2026-06-27T00:00:00.000Z");
    const malformed = detectMalformedLocalDataBackup(
      JSON.parse('{"documents":[],"__proto__":{"polluted":true}}') as unknown,
    );
    const report = buildLocalDataImportRestoreReviewReport({
      validationResult: validation,
      reviewModel,
      confirmation: confirmationDefault,
      importBlocker,
      restoreBlocker,
      generatedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(intake.accepted).toBe(true);
    expect(validation.status).toBe("valid");
    expect(validation.importPlan?.totals.rejectedProtected).toBe(1);
    expect(reviewModel.manualReviewRequired).toBe(true);
    expect(confirmationDefault.approvals.backupReviewed).toBe(false);
    expect(confirmationDefault.canProceedToApply).toBe(false);
    expect(confirmationApproved.approvals.externalReviewAccepted).toBe(true);
    expect(confirmationApproved.canProceedToApply).toBe(false);
    expect(importBlocker.blocked).toBe(true);
    expect(restoreBlocker.blocked).toBe(true);
    expect(adapter.read().canRead).toBe(false);
    expect(adapter.write().canWrite).toBe(false);
    expect(malformed.safe).toBe(false);
    expect(report.safe).toBe(true);
    expect(report.applyAllowed).toBe(false);
    expect(report.restoreAllowed).toBe(false);
    expect(JSON.stringify(report)).not.toContain("SYNTHETIC_ONLY_issued_1");
    expect(JSON.stringify(current)).toBe(beforeCurrent);
    expect(JSON.stringify(incoming)).toBe(beforeIncoming);
  });
});
