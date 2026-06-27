import { describe, expect, it } from "vitest";
import { buildImportRestoreDisabledActions } from "./import-restore-disabled-actions";
import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import { buildLocalDataImportRestoreReviewModel } from "./import-restore-review-model";
import { createDisabledLocalDataStorageAdapter } from "./localstorage-adapter-contract";
import { evaluateLocalDataSafetyUiShellScope } from "./ui-shell-scope";
import {
  buildImportRestoreUiWiringBlockers,
  evaluateImportRestoreUiWiringReadiness,
  summarizeImportRestoreUiWiringReadiness,
} from "./import-restore-ui-wiring-gate";

// PHASE2D33_IMPORT_RESTORE_UI_WIRING_READINESS_GATE_V1

function reviewModel() {
  const validation = runLocalDataBackupValidationPipeline(
    { documents: [] },
    {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 20,
      parsedObject: { documents: [] },
    },
    { validatedAt: "2026-06-27T00:00:00.000Z" },
  );
  return buildLocalDataImportRestoreReviewModel(validation);
}

describe("import restore UI wiring readiness gate", () => {
  it("is blocked by default", () => {
    const readiness = evaluateImportRestoreUiWiringReadiness({ generatedAt: "2026-06-27T00:00:00.000Z" });

    expect(readiness.status).toBe("blocked_by_default");
    expect(readiness.canWireUi).toBe(false);
    expect(readiness.applyImportAllowed).toBe(false);
    expect(readiness.blockers.length).toBeGreaterThan(0);
  });

  it("stays in review when disabled shell inputs are incomplete", () => {
    const model = reviewModel();
    const disabledActions = buildImportRestoreDisabledActions({ reviewModel: model });
    const readiness = evaluateImportRestoreUiWiringReadiness({ reviewModel: model, disabledActions });

    expect(readiness.status).toBe("ready_for_review");
    expect(readiness.blockers).toContain("Disabled UI shell scope is required.");
  });

  it("rejects unsafe apply flags", () => {
    const model = {
      ...reviewModel(),
      actions: {
        allowDryRunOnly: true,
        allowApplyImport: true,
        allowApplyRestore: true,
        requiresHumanConfirmation: true,
      },
    } as never;
    const readiness = evaluateImportRestoreUiWiringReadiness({ reviewModel: model });

    expect(readiness.status).toBe("rejected");
    expect(buildImportRestoreUiWiringBlockers({ reviewModel: model })).toContain("Import apply is not allowed.");
  });

  it("rejects active browser storage adapters", () => {
    const model = reviewModel();
    const disabledActions = buildImportRestoreDisabledActions({ reviewModel: model });
    const scope = evaluateLocalDataSafetyUiShellScope({ reviewModel: model, disabledActions });
    const readiness = evaluateImportRestoreUiWiringReadiness({
      reviewModel: model,
      disabledActions,
      scope,
      checklistPrepared: true,
      storageReadiness: {
        marker: "PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1",
        status: "disabled",
        canRead: true,
        canWrite: false,
        reason: "DISABLED_PENDING_UI_REVIEW_AND_BACKUP",
        evaluatedAt: "2026-06-27T00:00:00.000Z",
      } as never,
    });

    expect(readiness.status).toBe("rejected");
    expect(readiness.blockers).toContain("Browser storage adapter must remain disabled.");
  });

  it("can become ready for explicit decision without enabling wiring", () => {
    const model = reviewModel();
    const disabledActions = buildImportRestoreDisabledActions({ reviewModel: model });
    const scope = evaluateLocalDataSafetyUiShellScope({ reviewModel: model, disabledActions });
    const readiness = evaluateImportRestoreUiWiringReadiness({
      reviewModel: model,
      disabledActions,
      scope,
      storageAdapter: createDisabledLocalDataStorageAdapter("2026-06-27T00:00:00.000Z"),
      checklistPrepared: true,
    });
    const summary = summarizeImportRestoreUiWiringReadiness(readiness);

    expect(readiness.status).toBe("ready_for_explicit_wiring_decision");
    expect(readiness.canWireUi).toBe(false);
    expect(summary.safe).toBe(true);
  });
});
