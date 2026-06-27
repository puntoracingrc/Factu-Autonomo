import { describe, expect, it } from "vitest";
import {
  analyzeCustomerIdentityImportRisk,
  analyzeNumberingCountersRisk,
  analyzeSnapshotPdfHashRisk,
  assertLocalDataImportApplyBlocked,
  assertLocalDataRestoreApplyBlocked,
  buildCompositeLocalDataLossRiskAssessment,
  buildDocumentLifecycleRiskMatrix,
  buildLocalDataBackupIntegrityDigest,
  buildLocalDataBackupManifest,
  buildLocalDataImportRestoreReviewModel,
  buildLocalDataImportRestoreReviewReport,
  buildLocalDataSafetyReport,
  classifyLegacyBackupCompatibility,
  evaluateLargeBackupBoundary,
  evaluateLocalDataImportRestoreHumanConfirmation,
  listAdversarialBackupCorpusCases,
  listLocalDataSyntheticBackupCorpusCases,
  runAdversarialBackupCorpusCase,
  runLocalDataBackupValidationPipeline,
  summarizeAdversarialBackupCorpus,
  summarizeCompositeLocalDataLossRiskAssessment,
  summarizeLocalDataBackupManifest,
  validateLocalDataSyntheticBackupCorpusCase,
} from "../src/lib/local-data-safety";

// PHASE2D66_LOCAL_DATA_SAFETY_CORPUS_REGRESSION_ACCEPTANCE_V1

const fixedAt = "2026-06-27T00:00:00.000Z";

function assertSafeSerialized(value: unknown): void {
  expect(JSON.stringify(value)).not.toMatch(/documentSnapshot|rawPayload|fullPayload|authorization|cookie|privateKey/i);
}

describe("phase 2D.66 local data safety corpus regression acceptance", () => {
  it("walks the synthetic backup corpus through manifest, digest, dry-run, review and safe report", () => {
    const cases = listLocalDataSyntheticBackupCorpusCases();
    expect(cases.length).toBeGreaterThanOrEqual(12);

    for (const corpusCase of cases) {
      const caseValidation = validateLocalDataSyntheticBackupCorpusCase(corpusCase);
      expect(caseValidation.valid, corpusCase.id).toBe(true);

      const manifest = buildLocalDataBackupManifest(corpusCase.backupData, {
        generatedAt: fixedAt,
        source: "test_fixture",
      });
      const manifestSummary = summarizeLocalDataBackupManifest(manifest);
      const digest = buildLocalDataBackupIntegrityDigest(corpusCase.backupData, fixedAt);
      const validation = runLocalDataBackupValidationPipeline(
        corpusCase.currentData,
        {
          fileName: `${corpusCase.id}.json`,
          mimeType: "application/json",
          byteLength: JSON.stringify(corpusCase.backupData).length,
          parsedObject: corpusCase.backupData,
        },
        { validatedAt: fixedAt },
      );
      const reviewModel = buildLocalDataImportRestoreReviewModel(validation);
      const confirmation = evaluateLocalDataImportRestoreHumanConfirmation(validation, reviewModel, {}, fixedAt);
      const report = buildLocalDataImportRestoreReviewReport({
        validationResult: validation,
        reviewModel,
        confirmation,
        importBlocker: assertLocalDataImportApplyBlocked(fixedAt),
        restoreBlocker: assertLocalDataRestoreApplyBlocked(fixedAt),
        generatedAt: fixedAt,
      });
      const safeReport = buildLocalDataSafetyReport({
        manifest,
        integrityDigest: digest,
        importPlan: validation.importPlan,
        generatedAt: fixedAt,
      });
      const lifecycleMatrix = buildDocumentLifecycleRiskMatrix(corpusCase.backupData, { generatedAt: fixedAt });
      const numberingRisk = analyzeNumberingCountersRisk(corpusCase.currentData, corpusCase.backupData, { generatedAt: fixedAt });
      const customerRisk = analyzeCustomerIdentityImportRisk(corpusCase.currentData, corpusCase.backupData, { generatedAt: fixedAt });
      const largeBoundary = evaluateLargeBackupBoundary(corpusCase.backupData, {
        generatedAt: fixedAt,
        maxDocuments: 100,
        maxCustomers: 100,
      });

      expect(manifestSummary.totals.documents).toBeGreaterThanOrEqual(0);
      expect(digest.value).toMatch(/^[a-f0-9]{64}$/);
      expect(validation.status === "valid" || validation.errors.length > 0).toBe(true);
      expect(report.applyAllowed).toBe(false);
      expect(report.restoreAllowed).toBe(false);
      expect(safeReport.safe).toBe(true);
      assertSafeSerialized(manifestSummary);
      assertSafeSerialized(report);

      if (corpusCase.expectedManualReview || corpusCase.expectedRiskProfile !== "low") {
        expect(
          reviewModel.manualReviewRequired ||
            reviewModel.status === "blocked" ||
            report.severity === "blocked" ||
            report.manualReview ||
            lifecycleMatrix.manualReviewRequired ||
            lifecycleMatrix.totals.blocked > 0 ||
            numberingRisk.manualReviewRequired ||
            customerRisk.manualReviewRequired ||
            largeBoundary.status !== "within_limits",
          corpusCase.id,
        ).toBe(true);
      }
    }
  });

  it("aggregates lifecycle, numbering, snapshot, customer, legacy and boundary risks for every corpus case", () => {
    for (const corpusCase of listLocalDataSyntheticBackupCorpusCases()) {
      const lifecycle = buildDocumentLifecycleRiskMatrix(corpusCase.backupData, { generatedAt: fixedAt });
      const numbering = analyzeNumberingCountersRisk(corpusCase.currentData, corpusCase.backupData, { generatedAt: fixedAt });
      const snapshotPdfHash = analyzeSnapshotPdfHashRisk(corpusCase.currentData, corpusCase.backupData, { generatedAt: fixedAt });
      const customerIdentity = analyzeCustomerIdentityImportRisk(corpusCase.currentData, corpusCase.backupData, {
        generatedAt: fixedAt,
      });
      const legacyCompatibility = classifyLegacyBackupCompatibility(corpusCase.backupData, { generatedAt: fixedAt });
      const largeBackupBoundary = evaluateLargeBackupBoundary(corpusCase.backupData, {
        generatedAt: fixedAt,
        maxDocuments: 100,
        maxCustomers: 100,
      });
      const composite = buildCompositeLocalDataLossRiskAssessment({
        currentData: corpusCase.currentData,
        incomingData: corpusCase.backupData,
        lifecycle,
        numbering,
        snapshotPdfHash,
        customerIdentity,
        legacyCompatibility,
        largeBackupBoundary,
        generatedAt: fixedAt,
      });
      const summary = summarizeCompositeLocalDataLossRiskAssessment(composite);

      expect(summary.applyAllowed).toBe(false);
      expect(summary.restoreAllowed).toBe(false);
      expect(composite.recommendedNextSteps.join(" ")).toMatch(/disabled/i);
      assertSafeSerialized(summary);
    }
  });

  it("keeps adversarial corpus rejected or safe without payload echo", () => {
    const results = listAdversarialBackupCorpusCases().map(runAdversarialBackupCorpusCase);
    const summary = summarizeAdversarialBackupCorpus(results);

    expect(summary.allRejectedOrSafe).toBe(true);
    expect(summary.payloadEchoed).toBe(false);
    expect(results.every((result) => result.payloadEchoed === false)).toBe(true);
    assertSafeSerialized(summary);
  });
});
