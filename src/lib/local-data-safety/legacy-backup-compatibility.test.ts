import { describe, expect, it } from "vitest";
import { classifyLegacyBackupCompatibility, summarizeLegacyBackupCompatibility } from "./legacy-backup-compatibility";

// PHASE2D62_LEGACY_BACKUP_COMPATIBILITY_CLASSIFIER_V1

describe("legacy backup compatibility classifier", () => {
  it("classifies missing fields and partial app data conservatively", () => {
    const classification = classifyLegacyBackupCompatibility({
      documents: [{ id: "SYNTHETIC_ONLY_LEGACY_DRAFT", status: "borrador", paymentStatus: "paid", unknownField: "not_echoed" }],
      counters: "legacy-counter" as unknown as Record<string, unknown>,
    });
    const summary = summarizeLegacyBackupCompatibility(classification);

    expect(summary.status).toBe("manual_review_required");
    expect(summary.issueIds).toEqual(
      expect.arrayContaining([
        "missing_document_lifecycle",
        "missing_integrity_lock",
        "old_payment_status",
        "old_counters",
        "unknown_entity_fields",
        "partial_app_data",
      ]),
    );
    expect(summary.migrationAllowed).toBe(false);
  });

  it("blocks legacy protected non-draft documents", () => {
    const summary = summarizeLegacyBackupCompatibility(
      classifyLegacyBackupCompatibility({
        customers: [],
        documents: [{ id: "SYNTHETIC_ONLY_LEGACY_ISSUED", status: "emitida" }],
      }),
    );

    expect(summary.status).toBe("blocked");
    expect(summary.issueIds).toContain("legacy_protected_non_draft");
    expect(summary.applyAllowed).toBe(false);
  });
});
