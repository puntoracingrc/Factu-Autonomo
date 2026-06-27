import { describe, expect, it } from "vitest";
import {
  getImportRestoreSyntheticUiFixture,
  listImportRestoreSyntheticUiFixtures,
  validateImportRestoreSyntheticUiFixture,
} from "./import-restore-ui-fixtures";
import { parseInMemoryBackupJsonForPreview } from "./in-memory-backup-preview-harness";

// PHASE2D46_IMPORT_RESTORE_SYNTHETIC_UI_FIXTURES_V1

describe("import/restore synthetic UI fixtures", () => {
  it("lists the required synthetic-only scenarios", () => {
    const fixtures = listImportRestoreSyntheticUiFixtures();

    expect(fixtures.map((fixture) => fixture.scenario)).toEqual([
      "safe_backup_preview",
      "protected_overwrite_warning",
      "malformed_backup_rejected",
      "snapshot_mismatch_manual_review",
      "numbering_risk_manual_review",
      "empty_backup",
      "large_list_paginated",
    ]);
    for (const fixture of fixtures) {
      expect(fixture.id.startsWith("SYNTHETIC_ONLY_")).toBe(true);
      expect(validateImportRestoreSyntheticUiFixture(fixture).valid).toBe(true);
    }
  });

  it("parses the safe preview fixture without manual review", () => {
    const fixture = getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW");
    const preview = parseInMemoryBackupJsonForPreview({
      currentData: fixture.currentData,
      rawJson: fixture.rawJson,
      parsedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(preview.status).toBe(fixture.expectedStatus);
    expect(preview.reviewModel?.manualReviewRequired).toBe(false);
    expect(preview.applyImportAllowed).toBe(false);
    expect(preview.applyRestoreAllowed).toBe(false);
  });

  it("keeps risky fixtures preview-only with manual review", () => {
    for (const id of [
      "SYNTHETIC_ONLY_PROTECTED_OVERWRITE_WARNING",
      "SYNTHETIC_ONLY_SNAPSHOT_MISMATCH_MANUAL_REVIEW",
      "SYNTHETIC_ONLY_NUMBERING_RISK_MANUAL_REVIEW",
      "SYNTHETIC_ONLY_LARGE_LIST_PAGINATED",
    ] as const) {
      const fixture = getImportRestoreSyntheticUiFixture(id);
      const preview = parseInMemoryBackupJsonForPreview({
        currentData: fixture.currentData,
        rawJson: fixture.rawJson,
        parsedAt: "2026-06-27T00:00:00.000Z",
      });

      expect(preview.status).toBe("preview_ready");
      expect(preview.reviewModel?.manualReviewRequired).toBe(true);
      expect(preview.reviewModel?.riskFlags.length).toBeGreaterThan(0);
    }
  });

  it("rejects the malformed fixture safely", () => {
    const fixture = getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_MALFORMED_BACKUP_REJECTED");
    const preview = parseInMemoryBackupJsonForPreview({
      currentData: fixture.currentData,
      rawJson: fixture.rawJson,
      parsedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(preview.status).toBe("invalid");
    expect(preview.error?.safe).toBe(true);
  });
});
