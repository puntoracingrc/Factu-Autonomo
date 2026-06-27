import { describe, expect, it } from "vitest";
import { buildImportRestoreDataLossWarnings, summarizeImportRestoreDataLossWarnings } from "./import-restore-data-loss-warning";
import { getImportRestoreSyntheticUiFixture } from "./import-restore-ui-fixtures";

// PHASE2D49_IMPORT_RESTORE_DATA_LOSS_WARNING_MODEL_V1

describe("import/restore data-loss warnings", () => {
  it("builds protected, apply-disabled and backup-before-action warnings", () => {
    const fixture = getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_PROTECTED_OVERWRITE_WARNING");
    const warnings = buildImportRestoreDataLossWarnings({
      fixture,
      generatedAt: "2026-06-27T00:00:00.000Z",
    });
    const summary = summarizeImportRestoreDataLossWarnings(warnings);

    expect(summary.warningIds).toContain("protected_documents");
    expect(summary.warningIds).toContain("apply_disabled");
    expect(summary.warningIds).toContain("backup_before_future_actions");
    expect(summary.highestSeverity).toBe("blocked");
    expect(JSON.stringify(warnings)).not.toMatch(/seguro al 100%|restaurar ahora/i);
  });

  it("flags malformed and numbering risks with stable severity", () => {
    const malformed = buildImportRestoreDataLossWarnings({
      fixture: getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_MALFORMED_BACKUP_REJECTED"),
    });
    const numbering = buildImportRestoreDataLossWarnings({
      fixture: getImportRestoreSyntheticUiFixture("SYNTHETIC_ONLY_NUMBERING_RISK_MANUAL_REVIEW"),
    });

    expect(malformed.warnings.some((entry) => entry.id === "malformed_backup")).toBe(true);
    expect(malformed.highestSeverity).toBe("blocked");
    expect(numbering.warnings.some((entry) => entry.id === "numbering_risk")).toBe(true);
    expect(numbering.applyRestoreAllowed).toBe(false);
  });
});
