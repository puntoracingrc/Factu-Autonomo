import { describe, expect, it } from "vitest";
import { buildImportRestoreDisabledActions } from "./import-restore-disabled-actions";
import { buildLocalDataImportRestoreReviewModel } from "./import-restore-review-model";
import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import {
  evaluateLocalDataSafetyUiShellScope,
  summarizeLocalDataSafetyUiShellScope,
} from "./ui-shell-scope";

// PHASE2D21_DISABLED_IMPORT_RESTORE_UI_SHELL_SCOPE_V1

function reviewModel() {
  const validation = runLocalDataBackupValidationPipeline(
    { documents: [] },
    {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 200,
      parsedObject: { documents: [] },
    },
    { validatedAt: "2026-06-27T00:00:00.000Z" },
  );
  return buildLocalDataImportRestoreReviewModel(validation);
}

describe("disabled import restore UI shell scope", () => {
  it("is disabled by default", () => {
    const scope = evaluateLocalDataSafetyUiShellScope({ generatedAt: "2026-06-27T00:00:00.000Z" });

    expect(scope.status).toBe("disabled");
    expect(scope.disabledByDefault).toBe(true);
    expect(scope.routeConnected).toBe(false);
  });

  it("keeps missing review model disabled", () => {
    const summary = summarizeLocalDataSafetyUiShellScope(evaluateLocalDataSafetyUiShellScope());

    expect(summary.status).toBe("disabled");
    expect(summary.applyImportAllowed).toBe(false);
    expect(summary.applyRestoreAllowed).toBe(false);
  });

  it("rejects apply flags and route/navigation flags", () => {
    const model = {
      ...reviewModel(),
      actions: {
        allowDryRunOnly: true,
        allowApplyImport: true,
        allowApplyRestore: true,
        requiresHumanConfirmation: true,
      },
    } as never;

    const scope = evaluateLocalDataSafetyUiShellScope({
      reviewModel: model,
      disabledActions: buildImportRestoreDisabledActions({ reviewModel: model }),
      routeConnected: true,
      navigationConnected: true,
      appIntegrated: true,
      storageAccessRequested: true,
      realDataRequested: true,
    });

    expect(scope.status).toBe("blocked");
    expect(scope.reasons.join(" ")).toContain("Import apply");
    expect(scope.reasons.join(" ")).toContain("Route");
    expect(scope.reasons.join(" ")).toContain("Navigation");
  });

  it("can be ready only for future integration review with all outputs disabled", () => {
    const model = reviewModel();
    const scope = evaluateLocalDataSafetyUiShellScope({
      reviewModel: model,
      disabledActions: buildImportRestoreDisabledActions({ reviewModel: model }),
    });

    expect(scope.status).toBe("ready_for_future_ui_integration_review");
    expect(scope.applyImportAllowed).toBe(false);
    expect(scope.applyRestoreAllowed).toBe(false);
  });
});
