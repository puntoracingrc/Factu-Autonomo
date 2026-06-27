import { describe, expect, it } from "vitest";
import { evaluateLargeBackupBoundary, summarizeLargeBackupBoundary } from "./large-backup-boundary";

// PHASE2D64_LARGE_BACKUP_BOUNDARY_MODEL_V1

function documents(count: number) {
  return Array.from({ length: count }, (_, index) => ({ id: `SYNTHETIC_ONLY_DOC_${index}` }));
}

describe("large backup boundary model", () => {
  it("classifies within, near and over limits without fragile performance assertions", () => {
    expect(
      evaluateLargeBackupBoundary({ documents: documents(10), customers: [] }, { maxDocuments: 100, maxCustomers: 100 }).status,
    ).toBe("within_limits");
    expect(
      evaluateLargeBackupBoundary({ documents: documents(85), customers: [] }, { maxDocuments: 100, maxCustomers: 100 }).status,
    ).toBe("near_limit");
    expect(
      evaluateLargeBackupBoundary({ documents: documents(101), customers: [] }, { maxDocuments: 100, maxCustomers: 100 }).status,
    ).toBe("over_limit");
  });

  it("requires review for empty or partial backups and keeps apply disabled", () => {
    const summary = summarizeLargeBackupBoundary(evaluateLargeBackupBoundary({ documents: [], customers: [] }));

    expect(summary.status).toBe("manual_review_required");
    expect(summary.reasons).toContain("empty_or_partial_backup_requires_review");
    expect(summary.applyAllowed).toBe(false);
  });
});
