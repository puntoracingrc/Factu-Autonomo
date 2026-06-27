import { describe, expect, it } from "vitest";
import {
  buildCorpusScenarioDecisionMatrix,
  classifyCorpusScenarioDecision,
  summarizeCorpusScenarioDecisionMatrix,
} from "./corpus-scenario-decision-matrix";
import { getLocalDataSyntheticBackupCorpusCase, listLocalDataSyntheticBackupCorpusCases } from "./synthetic-backup-corpus";

// PHASE2D70_CORPUS_SCENARIO_DECISION_MATRIX_V1

describe("corpus scenario decision matrix", () => {
  it("classifies every synthetic case while keeping apply disabled", () => {
    const matrix = buildCorpusScenarioDecisionMatrix({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const summary = summarizeCorpusScenarioDecisionMatrix(matrix);

    expect(matrix.entries).toHaveLength(listLocalDataSyntheticBackupCorpusCases().length);
    expect(summary.allowApplyImport).toBe(false);
    expect(summary.allowApplyRestore).toBe(false);
    expect(summary.totals.preview_ok).toBeGreaterThanOrEqual(1);
    expect(summary.totals.too_large_review_required).toBeGreaterThanOrEqual(1);
    expect(summary.totals.malformed_rejected).toBeGreaterThanOrEqual(1);
  });

  it("keeps safe drafts in preview and protected documents blocked or reviewed", () => {
    const draft = classifyCorpusScenarioDecision(
      getLocalDataSyntheticBackupCorpusCase("SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP"),
      { generatedAt: "2026-06-27T00:00:00.000Z" },
    );
    const protectedCase = classifyCorpusScenarioDecision(
      getLocalDataSyntheticBackupCorpusCase("SYNTHETIC_ONLY_ISSUED_LOCKED_BACKUP"),
      { generatedAt: "2026-06-27T00:00:00.000Z" },
    );

    expect(draft.recommendedDecision).toBe("preview_ok");
    expect(draft.requiredHumanReview).toBe(false);
    expect(protectedCase.requiredHumanReview).toBe(true);
    expect(protectedCase.allowApplyImport).toBe(false);
  });
});
