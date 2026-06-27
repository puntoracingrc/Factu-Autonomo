import { describe, expect, it } from "vitest";
import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import { buildLocalDataImportRestoreReviewModel } from "./import-restore-review-model";
import {
  assertImportRestoreReviewViewModelSafe,
  buildImportRestoreReviewViewModel,
  summarizeImportRestoreReviewViewModel,
} from "./import-restore-view-model";

// PHASE2D22_IMPORT_RESTORE_REVIEW_VIEW_MODEL_V1

function reviewModelWithProtectedDocs() {
  const validation = runLocalDataBackupValidationPipeline(
    {
      documents: [
        {
          id: "SYNTHETIC_ONLY_issued_1",
          status: "emitida",
          documentLifecycle: "issued",
          integrityLock: "locked",
        },
      ],
    },
    {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 800,
      parsedObject: {
        documents: [
          {
            id: "SYNTHETIC_ONLY_issued_1",
            status: "emitida",
            documentLifecycle: "issued",
            integrityLock: "locked",
          },
        ],
      },
    },
    { validatedAt: "2026-06-27T00:00:00.000Z" },
  );
  return buildLocalDataImportRestoreReviewModel(validation);
}

describe("import restore review view model", () => {
  it("builds safe fields from the review model", () => {
    const viewModel = buildImportRestoreReviewViewModel(reviewModelWithProtectedDocs());

    expect(viewModel.marker).toBe("PHASE2D22_IMPORT_RESTORE_REVIEW_VIEW_MODEL_V1");
    expect(viewModel.limitBanner.title).toBe("Vista previa");
    expect(viewModel.disabledActions.applyImportBlocked).toBe(true);
    expect(viewModel.disabledActions.applyRestoreBlocked).toBe(true);
    expect(assertImportRestoreReviewViewModelSafe(viewModel).safe).toBe(true);
  });

  it("keeps protected docs and severity visible only as summary", () => {
    const viewModel = buildImportRestoreReviewViewModel(reviewModelWithProtectedDocs());
    const summary = summarizeImportRestoreReviewViewModel(viewModel);

    expect(viewModel.severity).toBe("warning");
    expect(viewModel.counters.protectedDocuments).toBe(1);
    expect(summary.disabledActionSummary.blockedActionIds).toContain("apply_restore");
    expect(JSON.stringify(viewModel)).not.toContain("SYNTHETIC_ONLY_issued_1");
  });

  it("redacts unsafe injected messages", () => {
    const model = reviewModelWithProtectedDocs();
    const unsafeModel = {
      ...model,
      sections: [
        {
          id: "overview",
          title: "<script>payload</script>",
          severity: "warning",
          count: 1,
          messages: ["documentSnapshot should be redacted"],
        },
      ],
    } as never;
    const viewModel = buildImportRestoreReviewViewModel(unsafeModel);

    expect(JSON.stringify(viewModel)).not.toContain("<script>");
    expect(JSON.stringify(viewModel)).not.toContain("documentSnapshot");
  });
});
