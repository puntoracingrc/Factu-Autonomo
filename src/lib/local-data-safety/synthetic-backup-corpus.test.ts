import { describe, expect, it } from "vitest";
import {
  getLocalDataSyntheticBackupCorpusCase,
  listLocalDataSyntheticBackupCorpusCases,
  summarizeLocalDataSyntheticBackupCorpusCase,
  validateLocalDataSyntheticBackupCorpusCase,
} from "./synthetic-backup-corpus";

// PHASE2D57_SYNTHETIC_BACKUP_CORPUS_REGISTRY_V1

const requiredCaseIds = [
  "SYNTHETIC_ONLY_EMPTY_APP_BACKUP",
  "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
  "SYNTHETIC_ONLY_ISSUED_LOCKED_BACKUP",
  "SYNTHETIC_ONLY_LEGACY_PROTECTED_BACKUP",
  "SYNTHETIC_ONLY_COUNTERS_MISMATCH_BACKUP",
  "SYNTHETIC_ONLY_SNAPSHOT_HASH_MISMATCH_BACKUP",
  "SYNTHETIC_ONLY_PDF_HASH_MISMATCH_BACKUP",
  "SYNTHETIC_ONLY_DUPLICATE_DOCUMENT_IDS_BACKUP",
  "SYNTHETIC_ONLY_DUPLICATE_CUSTOMER_IDS_BACKUP",
  "SYNTHETIC_ONLY_MIXED_VALID_AND_BLOCKED_BACKUP",
  "SYNTHETIC_ONLY_LARGE_LIST_BACKUP",
  "SYNTHETIC_ONLY_MALFORMED_SHAPE_BACKUP",
] as const;

describe("synthetic backup corpus registry", () => {
  it("lists the required synthetic-only cases with unique ids", () => {
    const cases = listLocalDataSyntheticBackupCorpusCases();
    const ids = cases.map((entry) => entry.id);

    expect(ids).toEqual(expect.arrayContaining([...requiredCaseIds]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(cases.every((entry) => entry.syntheticOnly && entry.id.startsWith("SYNTHETIC_ONLY_"))).toBe(true);
  });

  it("validates each corpus case and produces safe manifest/report summaries", () => {
    for (const id of requiredCaseIds) {
      const corpusCase = getLocalDataSyntheticBackupCorpusCase(id);
      const validation = validateLocalDataSyntheticBackupCorpusCase(corpusCase);
      const summary = summarizeLocalDataSyntheticBackupCorpusCase(corpusCase);
      const serializedSummary = JSON.stringify(summary);

      expect(validation.valid).toBe(true);
      expect(summary.syntheticOnly).toBe(true);
      expect(summary.manifest.manifestVersion).toBe("local-data-backup-manifest-v1");
      expect(summary.report.safe).toBe(true);
      expect(serializedSummary).not.toMatch(/documentSnapshot|rawPayload|fullPayload|authorization|cookie/i);
    }
  });

  it("rejects non-synthetic identifiers", () => {
    const corpusCase = getLocalDataSyntheticBackupCorpusCase("SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP");
    corpusCase.backupData.documents = [{ id: "REAL_DOC_1" }];

    expect(validateLocalDataSyntheticBackupCorpusCase(corpusCase).valid).toBe(false);
  });
});
