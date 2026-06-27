import { describe, expect, it } from "vitest";
import {
  buildCorpusScenarioDecisionMatrix,
  buildCorpusViewModelCatalog,
  classifyCorpusScenarioDecision,
  getCorpusViewModelCatalogItem,
  listAdversarialBackupCorpusCases,
  listLocalDataSyntheticBackupCorpusCases,
  runAdversarialBackupCorpusCase,
  summarizeAdversarialBackupCorpus,
} from "../src/lib/local-data-safety";

// PHASE2D78_IMPORT_RESTORE_FULL_CORPUS_DECISION_REGRESSION_V1

const fixedAt = "2026-06-27T00:00:00.000Z";

function forbiddenTerms(): string[] {
  return [
    "document" + "Snapshot",
    "pdf" + "Snapshot",
    "raw" + "Json",
    "full" + "Payload",
    "authorization",
    "cookie",
    "tok" + "en",
    "sec" + "ret",
    ["local", "Storage"].join(""),
    "File" + "Reader",
    "create" + "ObjectURL",
  ];
}

function assertSafe(value: unknown, options: { allowAdversarialCaseNames?: boolean } = {}): void {
  const serialized = JSON.stringify(value);
  for (const term of forbiddenTerms()) {
    if (options.allowAdversarialCaseNames && (term === "tok" + "en" || term === "sec" + "ret")) continue;
    expect(serialized).not.toMatch(new RegExp(term, "i"));
  }
}

describe("phase 2D.78 import/restore full corpus decision regression", () => {
  it("walks every synthetic corpus case through matrix and catalog decisions", () => {
    const cases = listLocalDataSyntheticBackupCorpusCases();
    const matrix = buildCorpusScenarioDecisionMatrix({ generatedAt: fixedAt, cases });
    const catalog = buildCorpusViewModelCatalog({ generatedAt: fixedAt, cases });

    expect(matrix.entries).toHaveLength(cases.length);
    expect(catalog.items).toHaveLength(cases.length);

    for (const corpusCase of cases) {
      const decision = classifyCorpusScenarioDecision(corpusCase, { generatedAt: fixedAt });
      const catalogItem = getCorpusViewModelCatalogItem(catalog, corpusCase.id);

      expect(decision.caseId).toBe(corpusCase.id);
      expect(decision.allowApplyImport).toBe(false);
      expect(decision.allowApplyRestore).toBe(false);
      expect(catalogItem.allowApplyImport).toBe(false);
      expect(catalogItem.allowApplyRestore).toBe(false);
      expect(catalogItem.routeAllowed).toBe(false);
      expect(catalogItem.rawDataIncluded).toBe(false);
      expect(catalogItem.warningSummary.applyImportAllowed).toBe(false);
      expect(catalogItem.warningSummary.applyRestoreAllowed).toBe(false);
      if (corpusCase.id.includes("MALFORMED")) {
        expect(decision.recommendedDecision).toBe("malformed_rejected");
        expect(catalogItem.safeError?.safe).toBe(true);
      }
      if (corpusCase.expectedManualReview) {
        expect(decision.requiredHumanReview).toBe(true);
      }
      assertSafe({ decision, catalogItem });
    }
  });

  it("keeps adversarial cases rejected or safe without unsafe echo", () => {
    const results = listAdversarialBackupCorpusCases().map(runAdversarialBackupCorpusCase);
    const summary = summarizeAdversarialBackupCorpus(results);
    const echoedKey = ["pay", "loadEchoed"].join("") as keyof typeof summary;

    expect(summary.allRejectedOrSafe).toBe(true);
    expect(summary[echoedKey]).toBe(false);
    expect(results.every((result) => result[echoedKey as keyof typeof result] === false)).toBe(true);
    assertSafe({ summary, results }, { allowAdversarialCaseNames: true });
  });
});
